import { publishedTimeHelper } from '@/helper/common';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sendTelegram } from '../sendTelegram';
import { buildProducts } from './buildProducts';
import { enrichProducts } from './enrichProducts';
import { exportExcel } from './exportExcel';
import { ProductPipelineContext } from "./types";
import { uploadProducts } from './uploadProducts';
import { CATEGORIES_COLLECTION, USERS_COLLECTION, WEBSITES_COLLECTION } from '@/constant/collections';

export async function runProductPipeline(context: ProductPipelineContext) {
    const { db } = await connectToDatabase();

    const user = await db.collection(USERS_COLLECTION).findOne({
        email: context.userEmail,
    });

    const website = await db.collection(WEBSITES_COLLECTION).findOne({
        _id: new ObjectId(context.websiteId),
    });

    const categories = await db
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
        promptDescriptionProduct: user.promptDescriptionProduct,
        promptTagsProduct: user.promptTagsProduct,
    });

    const excel = await exportExcel({
        products: aiProducts,
        website: website.shopName,
    });

    await sendTelegram({
        telegramId: user.telegramId,
        fileName: excel.fileName,
        filePath: excel.filePath,
    });
    const scheduledProducts = publishedTimeHelper({
        products: aiProducts,
        publicTime: user.publicTime,
        gapFrom: user.gapFrom,
        gapTo: user.gapTo,
    });
    await uploadProducts({
        products: scheduledProducts,
        website,
        socketId: context.socketId,
    });

    return aiProducts;
}