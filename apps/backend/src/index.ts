import express from 'express'
import { PORT } from './config'
import userRouter from './userRouter'

const app = express()

app.use(express.json())
app.use('/api/v1', userRouter)


app.listen(PORT,() => {
    console.log("Server is up")
})