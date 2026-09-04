import { publishedTimeHelper } from '@/helper/common';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sendTelegram } from '../telegram/sendTelegram';
import { buildProducts } from './buildProducts';
import { enrichProducts } from './enrichProducts';
import { exportExcel } from './exportExcel';
import { ProductPipelineContext } from "./types";
import { uploadProducts } from './uploadProducts';
import { CATEGORIES_COLLECTION, USERS_COLLECTION, WEBSITES_COLLECTION } from '@/constant/collections';

export async function runProductPipeline(context: ProductPipelineContext) {
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

    const products = await buildProducts({
        file: context.file,
        website,
        categories,
        socketId: context.socketId,
    });

    const aiProducts = await enrichProducts({
        products,
        website: website.shopName,
        apiKey: user.apiKey,
        socketId: context.socketId,
        mixed: user.mixed === true,
        promptDescriptionProduct: website.product.promptDescriptionProduct,
        promptTagsProduct: website.product.promptTagsProduct,
    });

    const scheduledProducts = publishedTimeHelper({
        products: aiProducts,
        publicTime: website.product.publicTime,
        gapFrom: website.product.gapFrom,
        gapTo: website.product.gapTo,
    });

    const excel = await exportExcel({
        products: scheduledProducts,
        website: website.shopName,
    });

    await sendTelegram({
        telegramId: user.telegramId,
        fileName: excel.fileName,
        filePath: excel.filePath,
    });

    await uploadProducts({
        products: scheduledProducts,
        website,
        socketId: context.socketId,
    });

    return aiProducts;
}