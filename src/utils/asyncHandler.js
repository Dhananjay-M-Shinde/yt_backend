const asyncHandler = (reqHandler) => {
    return (req, res, next) =>{
        Promise.resolve(reqHandler(req, res, next)).catch((err) =>{
            next(err)
        })
    }
}


export {asyncHandler}


// either we can use above method or we can use below way
// below is a higher order function i.e function which accept another function as an argument
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }