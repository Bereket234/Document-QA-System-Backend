import express, { Application, Request, Response, NextFunction } from "express";
import app from "./app";
import configs from "./config/configs";
import mongoose from "mongoose";

const port = configs.PORT || 3000;

mongoose.set('strictQuery', false)
mongoose.connect(configs.MONGO_DB_URI)
.then(()=>{
  console.log("db connected successfully!")
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
})
.catch(error=> console.log("Error connecting the DB",error))

