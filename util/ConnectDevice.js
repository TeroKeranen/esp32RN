import { Alert } from "react-native";
import http from "./http";
import { Buffer } from "buffer";
import {SERVICE_UUID, CHARACTERISTIC_SSID_UUID, CHARACTERISTIC_PASSWORD_UUID, CHARACTERISTIC_LED_UUID} from "@env";


// Käynnistä BLE-skannaus
export const scanForDevices = (manager, setDevices) => {
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
        // setDevices((prev) => [...prev, device]);
        //uusi
        setDevices((prev) => {
          const exists = prev.some((d) => d.id === device.id);
          if (!exists) {
            return [...prev, device];
          }
          return prev;
        })
      }
    });

    setTimeout(() => {
      console.log("[BLE] Stopping scan.");
      manager.stopDeviceScan();
    }, 5000);
  };


    // Yhdistä valittuun laitteeseen
    export const connectToDevice = async (device, setIsLoading, manager, setConnectedDevice, setConnectedDeviceId, setWifiConfigured, setConnectedDeviceInfo, setModalVisible) => {

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
          setModalVisible(true);
    
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
    export const sendWiFiCredentials = async (ssid, password, connectedDevice, connectedDeviceInfo, setIsLoading, setWifiConfigured, userId, setDevices, fetchUserDevices) => {

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

export const sendMotorCommand = async (direction) => {
  try {
    const response = await http.post("/api/motor", {
      direction,
    });

    console.log("[NodeJs] Motor command sent: ", response.data);

    
  } catch (error) {
    console.error("[NodeJS] Error sending motor command:", error.message);
  }
}

export const sendMotorSpeed = async (speed, direction) => {
  try {
    const response = await http.post("/api/motor/speed", {
      speed,
      direction,
    });

    console.log(`[NodeJs] Motor speed sent: ${speed}, Direction: ${direction}`);
  } catch (error) {
    console.error("[NodeJS] Error sending motor speed:", error.message);
  }
};

export const fetchRelayStatus = async (setRelayStatus) => {
  try {
    const response = await http.get("/api/relay-status"); // 🔹 Haetaan tieto Node.js API:sta
    setRelayStatus(response.data.relayStatus); // 🔹 Päivitetään React Native -tila
  } catch (error) {
    console.error("[fetchRelayStatus] Error fetching relay status:", error.message);
  }
};