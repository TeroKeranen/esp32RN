
import {configureStore} from '@reduxjs/toolkit';
import devicesReducer from './devices';
import userReducer from './user';
import { useReducer } from 'react';

const store = configureStore({
    reducer: {
        devices: devicesReducer,
        user: userReducer
    }
});

export default store;