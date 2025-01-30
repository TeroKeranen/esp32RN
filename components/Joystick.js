import { useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import {
    PanGestureHandler,
    GestureHandlerRootView,
    State,
  } from 'react-native-gesture-handler';
import { sendMotorCommand, sendMotorSpeed } from "../util/ConnectDevice";


const Joystick = ({onChange}) => {

    const [translateX] = useState(new Animated.Value(0));
    const [translateY] = useState(new Animated.Value(0));
    const JOYSTICK_RADIUS = 50;
    const MAX_DISTANCE = 50;


//       // Lähetä WebSocketin kautta joystickin arvoja
//     const sendJoystickCommand = (x, y) => {
//         let direction = "stop";
//         if (y > 0.2) {
//         direction = "forward";
//         } else if (y < -0.2) {
//         direction = "backward";
//         }
//         sendMotorCommand(direction);
//   };
      // Lähetä moottorin nopeus WebSocketin kautta
  const sendJoystickCommand = (x, y) => {
    const speed = Math.abs(y);  // Nopeus riippuu Y-akselista
    const direction = y > 0 ? "forward" : "backward";
    sendMotorSpeed(speed, direction);  // Lähetetään nopeus ja suunta
  };
  // Päivitä joystickin arvoja reaaliajassa
  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    {
      useNativeDriver: false,
      listener: (event) => {
        const { translationX, translationY } = event.nativeEvent;
        const x = Math.min(MAX_DISTANCE, Math.max(-MAX_DISTANCE, translationX));
        const y = Math.min(MAX_DISTANCE, Math.max(-MAX_DISTANCE, translationY));

        const normalizedX = (x / MAX_DISTANCE).toFixed(2);
        const normalizedY = (-y / MAX_DISTANCE).toFixed(2);  // Y-akseli käännetään

        sendJoystickCommand(normalizedX, normalizedY);
      },
    }
  );


  // Palauta joystick keskelle, kun ele päättyy
  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === 5) {  // State 5 tarkoittaa RELEASED
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      sendMotorSpeed(0, "stop");
    }
  };

    return (
        <GestureHandlerRootView>

        <View style={styles.container}>
            <View style={styles.joystickBackground}>
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
                >
                <Animated.View
                style={[
                    styles.joystick,
                    {
                        transform: [
                            { translateX: translateX },
                            { translateY: translateY },
                        ],
                    },
                ]}
                />
            </PanGestureHandler>
            </View>
      </View>
        </GestureHandlerRootView>
    )

}

const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 300,
    },
    joystickBackground: {
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: '#ddd',
      alignItems: 'center',
      justifyContent: 'center',
    },
    joystick: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#777',
    },
  });


export default Joystick;