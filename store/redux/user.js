import {createSlice} from '@reduxjs/toolkit';

const userSlice = createSlice({
    name:"user",
    initialState: {
        userId: "676b01c7435f36a898a7df5d",
        username: 'Test User',
    },
    reducers: {
        setUser(state, action) {
            state.userId = action.payload.userId;
            state.username = action.payload.username;
        }
    }
})


export const { setUser } = userSlice.actions;
export default userSlice.reducer;