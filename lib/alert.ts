import { Alert, Platform, type AlertButton } from 'react-native';

/** React Native Web does not implement Alert. Keep confirmations functional there. */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = [title, message].filter(Boolean).join('\n\n');
  const action = buttons?.find((button) => button.style !== 'cancel');
  if (buttons?.some((button) => button.style === 'cancel')) {
    if (window.confirm(text)) action?.onPress?.();
    else buttons.find((button) => button.style === 'cancel')?.onPress?.();
  } else {
    window.alert(text);
    action?.onPress?.();
  }
}
