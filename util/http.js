import axios from 'axios';
import {BASE_URL} from "@env";

export default axios.create({
    baseURL: process.env.BASE_URL
    // baseURL: "http://localhost:3000"
})