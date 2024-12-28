import axios from 'axios';

export default axios.create({
    baseURL: "https://esp32-server-3662e00021b5.herokuapp.com"
    // baseURL: "http://localhost:3000"
})