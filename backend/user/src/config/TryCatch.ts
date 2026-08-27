import type { RequestHandler } from "express"

const TryCatch = (handler: RequestHandler): RequestHandler =>{
    return (req, res, next) => {
        Promise.resolve(handler(req as any, res as any, next as any)).catch((error: any) => {
            res.status(500).json({
                message: error?.message ?? 'Internal Server Error'
            })
        })
    }
}

export default TryCatch;