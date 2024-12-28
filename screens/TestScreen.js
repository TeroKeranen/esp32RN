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

// BLE-UUID:t
const SERVICE_UUID = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const CHARACTERISTIC_SSID_UUID = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
const CHARACTERISTIC_PASSWORD_UUID = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const CHARACTERISTIC_LED_UUID = "6E400004-B5A3-F393-E0A9-E50E24DCCA9E";

const NODEJS_BASE_URL = "https://esp32-server-3662e00021b5.herokuapp.com"; // Vaihda omasi
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


  // Käynnistä BLE-skannaus
  const scanForDevices = () => {
    console.log("[BLE] Starting scan...");
    setDevices([]);

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("[BLE] Scan error:", error.message);
        Alert.alert("Error", "Bluetooth scanning failed: " + error.message);
        return;
      }
      if (device && device.name === "ESP32 Wi-Fi Config") {
        console.log("[BLE] Found device:", device.id, device.name);
        setDevices((prev) => [...prev, device]);
      }
    });

    setTimeout(() => {
      console.log("[BLE] Stopping scan.");
      manager.stopDeviceScan();
    }, 5000);
  };

  // Yhdistä valittuun laitteeseen
  const connectToDevice = async (device) => {

    setIsLoading(true);

    try {
      manager.stopDeviceScan();
      console.log(`[BLE] Connecting to device: ${device.id} (${device.name})`);

      const connected = await manager.connectToDevice(device.id, {
        autoConnect: false,
      });
      console.log("[BLE] Device connected:", connected.id);

      // Kuunnellaan disconnectia
      manager.onDeviceDisconnected(device.id, (error, disconnectedDevice) => {
        console.log(
          "[BLE] Device disconnected:",
          disconnectedDevice?.id,
          error
        );
        setConnectedDevice(null);
        setConnectedDeviceId("");
        setWifiConfigured(false);
      });

      // Hae palvelut/karakteristiikat
      await connected.discoverAllServicesAndCharacteristics();
      console.log("[BLE] Services and characteristics discovered.");

      setConnectedDevice(connected);

      console.log("connected", connected)

      // Aseta selkeä info, jota voit näyttää UI:ssa
      setConnectedDeviceInfo({
        id: connected.id,
        name: connected.name || "Unknown",
      });
      setIsLoading(false);

      Alert.alert("Connected", `Connected to ${device.name}`);
    } catch (error) {
      setIsLoading(false);
      console.error("[BLE] Connection error:", error.message);
      Alert.alert("Error", "Failed to connect to device");
    }
  };

  // WebSocket-yhteyden odotusfunktio
  const waitForWebSocket = () => {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            http.get('/api/ws-status')
                .then((response) => {
                    if (response.data.connected) {
                        clearInterval(interval);
                        resolve(true);
                    }
                })
                .catch((err) => {
                    console.error("[WebSocket] Waiting for reconnection...");
                });
        }, 2000);  // Tarkista 2 sekunnin välein
    });
  };

  // Lähetä SSID + Password BLE:llä
  const sendWiFiCredentials = async () => {

    console.log("TESTI 1", connectedDeviceInfo.id);
    if (!connectedDevice) {
      Alert.alert("Error", "No connected device");
      return;
    }
    try {
      setIsLoading(true);
      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_SSID_UUID,
        Buffer.from(ssid).toString("base64")
      );

      await connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_PASSWORD_UUID,
        Buffer.from(password).toString("base64")
      );

      setWifiConfigured(true);
      Alert.alert("Success", "Wi-Fi credentials sent to ESP32");
      
      
      
      // Odota hetki ennen kuin päivitetään laitteet
      setTimeout(async () => {
        try {
          const postResponse = await http.post(`/api/device`, {
            userId,
            deviceId: connectedDeviceInfo.id,
            name: "new device",
            type: "Keskus",
            status: "online"
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          console.log("Device added to DB:", postResponse.data);

          // Poista laite skannatuista laitteista
          setDevices((prevDevices) => 
            prevDevices.filter(device => device.id !== connectedDeviceInfo.id)
          );

          // Odota, että WebSocket-yhteys varmistuu
          await waitForWebSocket();

          // Päivitä käyttäjän laitteet tietokannasta
          fetchUserDevices(userId);
        
        } catch (err) {
          console.error("[POST /api/device] error:", err.message);
        }
      }, 5000);  // Odotetaan 5 sekuntia ennen kuin tarkistetaan laite
    } catch (error) {
      setIsLoading(false);
      console.error("[BLE] sendWiFiCredentials error:", error);
      Alert.alert("Error", "Failed to send Wi-Fi credentials");
    }
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

        <TouchableOpacity style={styles.btn} onPress={scanForDevices}>
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
              <TouchableOpacity style={styles.btn} onPress={() => connectToDevice(item)}>
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
            </View>
        ))
    )} 
</View>
      {/* {(myDeviceFromDb || wifiConfigured) && (
      
        <View style={styles.toggleBtn}>
          <Text style={styles.toggleTitle}>LED Control (via Node.js):</Text>

          <TouchableOpacity style={styles.btn} onPress={() => toggleLEDViaNodeJS(true)}>
            <Text style={{color: 'white'}}>Turn Led on</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btn} onPress={() => toggleLEDViaNodeJS(false)}>
            <Text style={{color: 'white'}}>Turn Led off</Text>
          </TouchableOpacity>
          
          <View style={{ height: 10 }} />

          <View style={{ marginTop: 10 }}>
            <Text>LED is currently {ledState ? "ON" : "OFF"}</Text>
          </View>
        </View>
      )} */}


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
      {/* {dbDevices.length > 0 && (

        <View style={styles.userDevices}>
        <Text style={{ fontWeight: "bold" }}>Devices in DB:</Text>
        {dbDevices.length === 0 && <Text>No devices found for user {userId}</Text>}
        {dbDevices.map((dev) => (
          <Text key={dev.id}>
            DeviceID: {dev.device_id} - SSID: {dev.ssid}
          </Text>
        ))}
      </View>

      )} */}

      {/* Syötetään SSID / Password vain jos laitetta ei ole vielä Wi-Fi:ssä */}
      {connectedDevice && !wifiConfigured && (
        <View style={styles.sendCredentials}>
          <TextInput
            placeholder="Enter SSID"
            value={ssid}
            onChangeText={setSsid}
            style={styles.input}
          />
          <TextInput
            placeholder="Enter Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          <TouchableOpacity style={styles.btn} onPress={sendWiFiCredentials}>
            <Text style={{color:'white'}}> Send Wi-Fi Credentials</Text>
          </TouchableOpacity>
          
        </View>
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