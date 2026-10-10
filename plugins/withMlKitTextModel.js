const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

/**
 * expo-text-extractor uses the Google Play services build of ML Kit text recognition,
 * whose model is downloaded separately. Asking Play to install it with the app means
 * photo import works offline from the first launch instead of failing until a download.
 */
module.exports = function withMlKitTextModel(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, 'com.google.mlkit.vision.DEPENDENCIES', 'ocr');
    return config;
  });
};
