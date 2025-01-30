import { Alert, Button, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";


const SendWifiModal = ({isVisible, onClose, ssid, setSsid, password, setPassword, sendWiFiCredentials}) => {

    return (
        <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <SafeAreaView style={{flex: 1}}>
                <View style={styles.container}>
                    <View style={styles.modalView}>


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

                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    )

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems:'center'
    },
    modalView: {
        backgroundColor: "white",
        borderRadius: 20,
        paddingVertical: 35,
        paddingHorizontal: 55,
        width: "90%",
        height: '70%',
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
        width: 0,
        height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    sendCredentials: {
        flex: 1,
        padding: 20,
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

})

export default SendWifiModal;