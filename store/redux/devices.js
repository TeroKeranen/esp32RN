import {createSlice} from '@reduxjs/toolkit';


const devicesSlice = createSlice({
    name: 'devices',
    initialState: {
        savedDeviceId: null,
        devicesList: [],
    },
    reducers: {
        setSavedDeviceId: (state, action) => {
            state.savedDeviceId = action.payload;
          },
          clearSavedDeviceId: (state) => {
            state.savedDeviceId = null;
          },
          setDevicesList: (state, action) => {
            state.devicesList = action.payload;
          }
    }
});

export const {setSavedDeviceId, clearSavedDeviceId, setDevicesList} = devicesSlice.actions;
export default devicesSlice.reducer;