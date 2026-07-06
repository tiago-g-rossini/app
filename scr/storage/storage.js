import AsyncStorage from "@react-native-async-storage/async-storage";

export async function storageGet(chave, valorPadrao) {
  try {
    const bruto = await AsyncStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : valorPadrao;
  } catch {
    return valorPadrao;
  }
}

export async function storageSet(chave, valor) {
  try {
    await AsyncStorage.setItem(chave, JSON.stringify(valor ?? null));
  } catch (e) {
    // silencioso — evita derrubar o app por causa de storage
  }
}