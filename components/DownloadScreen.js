import { View, Text, StyleSheet, ActivityIndicator} from "react-native";

const DownloadScreen = ({message}) => {

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text>{message}...</Text>
        </View>
    );

}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center", // Keskittää sisällön pystysuunnassa
      alignItems: "center", // Keskittää sisällön vaakasuunnassa
      padding: 20,
    },
  });
  
  
  export default DownloadScreen;