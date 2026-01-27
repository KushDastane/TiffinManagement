import React, { Component, useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
    StyleSheet,
    Button,
    View,
    SafeAreaView,
    Text,
    Modal,
    ActivityIndicator,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';

const FIREBASE_JS_VERSION = '9.0.0'; // Using a stable version for the webview

const getWebviewSource = (firebaseConfig, invisible, languageCode) => {
    return {
        baseUrl: `https://${firebaseConfig.authDomain}`,
        html: `
<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <script src="https://www.gstatic.com/firebasejs/${FIREBASE_JS_VERSION}/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/${FIREBASE_JS_VERSION}/firebase-auth-compat.js"></script>
  <script type="text/javascript">
    firebase.initializeApp(${JSON.stringify(firebaseConfig)});
  </script>
  <style>
    html, body { 
      height: 100%; 
      margin: 0; 
      padding: 0; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      background-color: #ffffff;
    }
    #recaptcha-cont {
      display: inline-block;
      margin: 0 auto;
    }
    #recaptcha-btn { 
      width: 100%; 
      height: 100%; 
      border: 0; 
      opacity: 0;
    }
  </style>
</head>
<body>
  ${invisible
                ? `<button id="recaptcha-btn" type="button" onclick="onClickButton()">Confirm</button>`
                : `<div id="recaptcha-cont" class="g-recaptcha"></div>`}
  <script>
    var fullChallengeTimer;
    function onVerify(token) {
      if (fullChallengeTimer) clearInterval(fullChallengeTimer);
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verify', token: token }));
    }
    function onLoad() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'load' }));
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("${invisible ? 'recaptcha-btn' : 'recaptcha-cont'}", {
        size: "${invisible ? 'invisible' : 'normal'}",
        callback: onVerify
      });
      window.recaptchaVerifier.render();
    }
    function onError() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
    }
    function onClickButton() {
      if (!fullChallengeTimer) {
        fullChallengeTimer = setInterval(function() {
          var iframes = document.getElementsByTagName("iframe");
          var isFullChallenge = false;
          for (var i = 0; i < iframes.length; i++) {
            var parentWindow = iframes[i].parentNode ? iframes[i].parentNode.parentNode : undefined;
            var isHidden = parentWindow && parentWindow.style.opacity == 0;
            isFullChallenge = isFullChallenge || (
              !isHidden && 
              ((iframes[i].title === 'recaptcha challenge') ||
               (iframes[i].src.indexOf('google.com/recaptcha/api2/bframe') >= 0)));
          }
          if (isFullChallenge) {
            clearInterval(fullChallengeTimer);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fullChallenge' }));  
          }
        }, 100);
      }
    }
    window.addEventListener('message', function(event) {
      if (event.data.verify) {
        document.getElementById('recaptcha-btn').click();
      }
    });
  </script>
  <script src="https://www.google.com/recaptcha/api.js?onload=onLoad&render=explicit&hl=${languageCode || ''}" onerror="onError()"></script>
</body></html>`,
    };
};

const FirebaseRecaptchaModal = forwardRef((props, ref) => {
    const {
        firebaseConfig,
        title = 'Security Verification',
        cancelLabel = 'Cancel',
        onVerify,
        attemptInvisibleVerification = false,
        languageCode,
    } = props;

    const [visible, setVisible] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [invisibleVerify, setInvisibleVerify] = useState(false);
    const [invisibleKey, setInvisibleKey] = useState(1);
    const [callbacks, setCallbacks] = useState({ resolve: null, reject: null });

    const webviewRef = useRef(null);

    useImperativeHandle(ref, () => ({
        type: 'recaptcha',
        verify: () => {
            return new Promise((resolve, reject) => {
                if (attemptInvisibleVerification) {
                    setInvisibleVerify(true);
                    setCallbacks({ resolve, reject });
                } else {
                    setVisible(true);
                    setLoaded(false);
                    setCallbacks({ resolve, reject });
                }
            });
        },
        _reset: () => {
            setInvisibleVerify(false);
        }
    }));

    useEffect(() => {
        if (invisibleVerify && webviewRef.current && loaded) {
            webviewRef.current.injectJavaScript(`
                (function(){
                  window.dispatchEvent(new MessageEvent('message', {data: { verify: true }}));
                })();
                true;
            `);
        }
    }, [invisibleVerify, loaded]);

    if (!firebaseConfig) {
        console.error("FirebaseRecaptchaModal: Missing firebaseConfig");
        return null;
    }

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            switch (data.type) {
                case 'load':
                    setLoaded(true);
                    break;
                case 'error':
                    if (callbacks.reject) callbacks.reject(new Error('Failed to load reCAPTCHA'));
                    setVisible(false);
                    setInvisibleVerify(false);
                    break;
                case 'verify':
                    if (callbacks.resolve) callbacks.resolve(data.token);
                    if (onVerify) onVerify(data.token);
                    setVisible(false);
                    setInvisibleVerify(false);
                    setInvisibleKey(prev => prev + 1);
                    break;
                case 'fullChallenge':
                    setInvisibleVerify(false);
                    setVisible(true);
                    break;
            }
        } catch (e) {
            console.warn("reCAPTCHA message error:", e);
        }
    };

    const handleCancel = () => {
        if (callbacks.reject) callbacks.reject(new Error('Cancelled by user'));
        setVisible(false);
    };

    return (
        <>
            <View style={styles.invisibleContainer}>
                <WebView
                    ref={webviewRef}
                    key={`invisible-${invisibleKey}`}
                    javaScriptEnabled
                    source={getWebviewSource(firebaseConfig, true, languageCode)}
                    onMessage={handleMessage}
                    style={styles.invisibleWebView}
                />
            </View>
            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleCancel}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <Text style={styles.title}>{title}</Text>
                            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                                <Text style={styles.cancelText}>{cancelLabel}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.content}>
                        <WebView
                            javaScriptEnabled
                            automaticallyAdjustContentInsets
                            scalesPageToFit
                            mixedContentMode="always"
                            source={getWebviewSource(firebaseConfig, false, languageCode)}
                            onMessage={handleMessage}
                            style={styles.webview}
                        />
                        {!loaded && (
                            <View style={styles.loader}>
                                <ActivityIndicator size="large" color="#ca8a04" />
                            </View>
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </>
    );
});

const styles = StyleSheet.create({
    invisibleContainer: {
        width: 0,
        height: 0,
        position: 'absolute',
        opacity: 0,
    },
    invisibleWebView: {
        width: 1,
        height: 1,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    header: {
        backgroundColor: '#ffffff',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111822',
    },
    cancelButton: {
        padding: 4,
    },
    cancelText: {
        fontSize: 15,
        color: '#6b7280',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
});

export default FirebaseRecaptchaModal;
