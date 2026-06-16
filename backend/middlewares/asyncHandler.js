const asyncHandler = (fn) => (req, res, next) => {
<<<<<<< HEAD
    Promise.resolve(fn(req, res, next)).catch((err)=>next(err));
=======
    Promise.resolve(fn(req, res, next)).catch((err))
>>>>>>> santosh/main
};
export default asyncHandler;