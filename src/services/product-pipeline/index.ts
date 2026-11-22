import { publishedTimeHelper } from '@/helper/common';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sendTelegram } from '../telegram/sendTelegram';
import { sendTelegramMessage } from '../telegram/sendTelegramMessage';
import { buildProducts } from './buildProducts';
import { enrichProducts } from './enrichProducts';
import { exportExcel } from './exportExcel';
import { resolvePipelineProcesses } from './options';
import { ProductPipelineContext } from "./types";
import { uploadProducts } from './uploadProducts';
import { CATEGORIES_COLLECTION, USERS_COLLECTION, WEBSITES_COLLECTION } from '@/constant/collections';
import { createVideoJobsFromPipeline } from '../video/createVideoJobsFromPipeline';

export async function runProductPipeline(context: ProductPipelineContext) {
    const processes = resolvePipelineProcesses(context.processes);
    const { db } = await connectToDatabase();

    const user: any = await db.collection(USERS_COLLECTION).findOne({
        email: context.userEmail,
    });

    const website: any = await db.collection(WEBSITES_COLLECTION).findOne({
        _id: new ObjectId(context.websiteId),
    });

    const categories: any[] = await db
        .collection(CATEGORIES_COLLECTION)
        .find({ shopID: website._id.toString() })
        .toArray();

    const builtProducts = processes.buildProducts
        ? await buildProducts({
            file: context.file,
            website,
            categories,
            socketId: context.socketId,
        })
        : [];

    const processedProducts = processes.enrichProducts
        ? await enrichProducts({
            products: builtProducts,
            website: website.shopName,
            apiKey: user.apiKey,
            geminiApiKey: user.geminiApiKey,
            socketId: context.socketId,
            mixed: user.mixed === true,
            aiProvider: website.product?.aiProvider,
            promptDescriptionProduct: website.product.promptDescriptionProduct,
            promptTagsProduct: website.product.promptTagsProduct,
            researchEnabled: website.product?.researchEnabled === true,
        })
        : builtProducts;

    const scheduledProducts = publishedTimeHelper({
        products: processedProducts,
        publicTime: website.product.publicTime,
        gapFrom: website.product.gapFrom,
        gapTo: website.product.gapTo,
    });

    let productIds: number[] = [];
    if (processes.uploadProducts) {
        const uploadResult = await uploadProducts({
            products: scheduledProducts,
            website,
            socketId: context.socketId,
        });
        productIds = uploadResult.productIds;
    }

    const excel = await exportExcel({
        products: scheduledProducts,
        website: website.shopName,
    });

    await sendTelegram({
        telegramId: user.telegramId,
        fileName: excel.fileName,
        filePath: excel.filePath,
    });

    if (processes.uploadProducts && website.autoVideo?.enabled && productIds.length > 0) {
        try {
            await createVideoJobsFromPipeline({
                websiteId: context.websiteId,
                productIds,
                website,
            });
        } catch (error: any) {
            console.error(`[PIPELINE] Failed to create video jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
            if (user.telegramId) {
                await sendTelegramMessage({
                    telegramId: user.telegramId,
                    message: `<b>Video Pipeline Error</b>\n\nFailed to create video jobs: ${error?.message || 'Unknown error'}`,
                }).catch(() => { });
            }
        }
    }

    return processedProducts;
}