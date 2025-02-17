import express from 'express';
import { PORT } from './config';
import userRouter from './userRouter';
import userTransfer from './transfer';
import { config } from 'dotenv';
config();

const app = express()

app.use(express.json())
app.use('/api/v1/user', userRouter)
app.use("/api/v1", userTransfer)


app.listen(PORT,() => {
    console.log("Server is up")
})