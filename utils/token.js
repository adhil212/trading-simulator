import jwt from "jsonwebtoken"

function generatetoken(user){
   return jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:"1d"})
}

export default generatetoken;
