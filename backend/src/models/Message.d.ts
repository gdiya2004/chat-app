import mongoose from "mongoose";
export declare const Message: mongoose.Model<{
    createdAt: NativeDate;
    text?: string | null;
    sender?: string | null;
    roomId?: string | null;
}, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    text?: string | null;
    sender?: string | null;
    roomId?: string | null;
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    createdAt: NativeDate;
    text?: string | null;
    sender?: string | null;
    roomId?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    createdAt: NativeDate;
    text?: string | null;
    sender?: string | null;
    roomId?: string | null;
}, mongoose.Document<unknown, {}, {
    createdAt: NativeDate;
    text?: string | null;
    sender?: string | null;
    roomId?: string | null;
}, {
    id: string;
}, mongoose.DefaultSchemaOptions> & Omit<{
    createdAt: NativeDate;
    text?: string | null;
    sender?: string | null;
    roomId?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, unknown, {
    createdAt: NativeDate;
    text?: string | null;
    sender?: string | null;
    roomId?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    createdAt: NativeDate;
    text?: string | null;
    sender?: string | null;
    roomId?: string | null;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
//# sourceMappingURL=Message.d.ts.map