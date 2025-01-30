import React, { useState, useEffect } from "react";
import {
  Alert,
  Button,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  Touchable,
  TouchableOpacity,
  View,
} from "react-native";
import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import http from "../util/http";
import { useSelector } from "react-redux";
import DownloadScreen from "../components/DownloadScreen";
import { connectToDevice, scanForDevices, sendWiFiCredentials, sendMotorCommand } from "../util/ConnectDevice";
import SendWifiModal from "../components/SendWifiModal";
import Joystick from "../components/Joystick";




const manager = new BleManager();

export default function TestScreen() {

  const [isTesting, setIsTesting] = useState(true);
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connectedDeviceId, setConnectedDeviceId] = useState("");
  // Laitteet, jotka on haettu tietokannasta
  const [dbDevices, setDbDevices] = useState([]);

  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [ledState, setLedState] = useState(false);
  const [wifiConfigured, setWifiConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
    // Tallennetaan myös selkeä info-olio
    const [connectedDeviceInfo, setConnectedDeviceInfo] = useState({
      id: "",
      name: "",
    });

    const [modalVisible, setModalVisible] = useState(false);
    const [joystickValue, setJoystickValue] = useState({ x: 0, y: 0 });

  // Jos haluat hakea userId Reduxista
  const userId = useSelector((state) => state.user.userId);
  console.log("userid", userId);

  // BLE skannaus
  useEffect(() => {
    const subscription = manager.onStateChange((state) => {
      if (state === "PoweredOn") {
        scanForDevices();
      }
    }, true);

    return () => {
      subscription.remove();
      manager.destroy();
    };
  }, []);

  useEffect(() => {
    // Kun näyttö aukeaa, haetaan mahdolliset jo tallennetut laitteet kannasta
    fetchUserDevices(userId);
  }, [dbDevices.length]);

  const fetchUserDevices = async (userId) => {
    setIsLoading(true);
    try {
      const response = await http.get(`/api/devices/${userId}`);
      console.log("[fetchUserDevices] response:", response.data);

              // Parsitaan jokainen laite JSON-objektiksi
              const formattedDevices = response.data.map(space => ({
                ...space,
                devices: space.devices.map(device => JSON.parse(device))  // Parsitaan laitteet
            }));

            console.log("[fetchUserDevices] formatted response:", formattedDevices);
              // Asetetaan laitteet tilaan
              const devices = formattedDevices.length > 0 ? formattedDevices[0].devices : [];
              setDbDevices(devices || []);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error("[fetchUserDevices] error:", error.message);
    }
  };

  const handleSendCredentials = async () => {
    if (!ssid || !password) {
      alert("Please enter SSID and Password.");
      return;
    }
    await sendWiFiCredentials(
      ssid,
      password,
      connectedDevice,
      connectedDeviceInfo,
      setIsLoading,
      setWifiConfigured,
      userId,
      setDevices,
      fetchUserDevices
    );
    setModalVisible(false);
  };






  // Node.js-backend -> LED on/off
  const toggleLEDViaNodeJS = async (turnOn) => {
    try {
      const response = await http.post(`/api/led`, {
        state: turnOn ? "on" : "off",
      });
      console.log("[NodeJS] LED toggle response:", response.data);
      // Alert.alert("LED Command", response.data.message || "Command sent");
      setLedState(turnOn);
    } catch (error) {
      console.error("[NodeJS] Error toggling LED:", error.message);
      Alert.alert("Error", "Could not toggle LED via Node.js");
    }
  };

  const handleMotorForward = () => {
    sendMotorCommand("forward");
  }

  const handleMotorBackward = () => {
    sendMotorCommand("backward");
  }

  const handleMotorStop = () => {
    sendMotorCommand("stop");
  }




  // Valitaan “ensimmäinen” laite kannasta, jos halutaan näyttää, että userilla on jo laite
  const myDeviceFromDb = dbDevices.length > 0 ? dbDevices[0] : null;
  console.log("MYDEVICEFROMDB :", myDeviceFromDb);

  if (isLoading) {
    return <DownloadScreen message="loading"/>
  }
  console.log("DBDEVICES", dbDevices);
  return (
    <SafeAreaView style={styles.container}>
      {/* Skannaa laitteet */}
      <View style={styles.scan}>

      
      <Text>
        X: {joystickValue.x.toFixed(2)} Y: {joystickValue.y.toFixed(2)}
      </Text>

        <TouchableOpacity style={styles.btn} onPress={() => scanForDevices(manager, setDevices)}>
          <Text style={{color: 'white', fontSize: 20}}>Scan for devices</Text>
        </TouchableOpacity>
  
      </View>

      {/* Listaa löydetyt laitteet */}
      <View>

        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.deviceItem}>
              <Text style={styles.deviceName}>
                {item.name}
              </Text>
              <Text style={styles.deviceName}>
              {item.id}
              </Text>
              <TouchableOpacity style={styles.btn} onPress={() => connectToDevice(item, setIsLoading, manager, setConnectedDevice, setConnectedDeviceId, setWifiConfigured, setConnectedDeviceInfo, setModalVisible)}>
                <Text style={{color: 'white'}}>Connect</Text>
              </TouchableOpacity>
              
            </View>
            )}
        />
      </View>
      
      {/* Kun Wi-Fi on konffattu, näytä LED-komennot */}
      <View>
    {(dbDevices.length > 0 || wifiConfigured) && (
        dbDevices.map((device, index) => (
            <View key={device.deviceId || index} style={styles.deviceItem}>
                <Text style={styles.deviceText}>Device: {device.name}</Text>
                <Text>Status: {device.status}</Text>
                <TouchableOpacity 
                    onPress={() => toggleLEDViaNodeJS(true)}
                    style={styles.btn}
                >
                    <Text style={{ color: 'white' }}>Turn On</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btn} onPress={() => toggleLEDViaNodeJS(false)}>
                  <Text style={{color: 'white'}}>Turn Led off</Text>
                </TouchableOpacity>
{/* 
                <TouchableOpacity style={styles.btn} onPress={handleMotorForward}>
                <Text style={styles.btnText}>Move Forward</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.btn} onPress={handleMotorBackward}>
                <Text style={styles.btnText}>Move Backward</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.btn} onPress={handleMotorStop}>
                <Text style={styles.btnText}>stop</Text>
                </TouchableOpacity> */}
            </View>
        ))
      )} 
</View>
      <Joystick onChange={(value) => setJoystickValue(value)} />



      {/* Näytä tallennetut laitteet kannasta */}
      {dbDevices.length > 0 ? (
        
        dbDevices.map((device, index) => (
          <View key={device.deviceId || index} style={styles.userDevices}>
            <Text>DeviceId: {device.name}</Text>
          </View>
        ))
      ) : (
        <Text>null</Text>
      )}

      {/* Syötetään SSID / Password vain jos laitetta ei ole vielä Wi-Fi:ssä */}
      {connectedDevice && !wifiConfigured && (
        <SendWifiModal 
          isVisible={modalVisible}
          onClose={() => setModalVisible(false)}
          ssid={ssid}
          setSsid={setSsid}
          password={password}
          setPassword={setPassword}
          sendWiFiCredentials={handleSendCredentials}
        />
      )}


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  scan: {
    flex:1,
  },
  deviceItem: {
    marginBottom: 20,
    padding: 8,
    borderWidth: 1,
    alignItems: 'center'
  },
  deviceName: {
    fontWeight: 500,
  },
  toggleTitle: {
    fontSize: 20,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  btn: {
    backgroundColor: "#507ab8",
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
    // width: "50%",
    alignItems: "center",
    alignSelf:'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sendCredentials: {
    flex: 1,
    padding: 20,
  },
  userDevices: {
    flex: 1,
    borderWidth: 1,
  },
  toggleBtn: {
    flex: 2,
    alignItems: 'center',

  }
});