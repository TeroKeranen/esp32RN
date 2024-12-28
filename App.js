import { StatusBar } from 'expo-status-bar';
import {Provider} from 'react-redux';
import { StyleSheet, Text, View } from 'react-native';
import TestScreen from './screens/TestScreen';

import store from './store/redux/store';

export default function App() {
  return (
    <Provider store={store}>
      <TestScreen />
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
