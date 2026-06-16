<<<<<<< HEAD
import jwt from "jsonwebtoken";
=======
>>>>>>> santosh/main
const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "30d"
    });

    res.cookie('jwt', token, {
        httpOnly: true,
        sameSite: "strict",
<<<<<<< HEAD
=======
        // secure: process.env.NODE_ENV === 'production',
>>>>>>> santosh/main
        maxAge: 30 * 24 * 60 * 60 * 1000 
    });
    
}

export default generateToken;