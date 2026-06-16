import mongoose from "mongoose";
import bcrypt from "bcryptjs";
<<<<<<< HEAD
//userSchema for user model
=======

>>>>>>> santosh/main
const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    surname: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
<<<<<<< HEAD
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    adharVerificationDocument: {
      type: String,
      default: null,
    },
=======
    isAdmin: {
      type: Boolean,
      default: false,
    }
>>>>>>> santosh/main
  },
  { timestamps: true }
);

<<<<<<< HEAD

//matching passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};
=======
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };
>>>>>>> santosh/main

//hashing password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

<<<<<<< HEAD
//Model creation
=======

>>>>>>> santosh/main
const User = mongoose.model("User", userSchema);

export default User;