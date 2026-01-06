/**
 * Animated Splash Screen Component
 * 
 * This screen:
 * - Shows AdsBarter logo with beautiful animations for 5-6 seconds
 * - Features fade-in, scale, pulse, and glow effects
 * - Has an attractive gradient background
 * - Then checks authentication status
 * - Navigates to Home if token is valid
 * - Navigates to Onboarding if token is invalid or doesn't exist
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ onAuthCheckComplete }) => {
  const { restoreSession } = useAuth();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const taglineFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations sequence
    Animated.parallel([
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      // Scale animation with bounce
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After initial animations, start pulse and glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Text fade in after logo appears
    Animated.timing(textFadeAnim, {
      toValue: 1,
      duration: 1000,
      delay: 1000,
      useNativeDriver: true,
    }).start();

    // Tagline fade in
    Animated.timing(taglineFadeAnim, {
      toValue: 1,
      duration: 1000,
      delay: 1500,
      useNativeDriver: true,
    }).start();

    // Check authentication after 5 seconds
    const authTimer = setTimeout(async () => {
      try {
        const isAuthenticated = await restoreSession();
        if (onAuthCheckComplete) {
          onAuthCheckComplete(isAuthenticated);
        }
      } catch (error) {
        console.error('[Splash] Auth check error:', error);
        if (onAuthCheckComplete) {
          onAuthCheckComplete(false);
        }
      }
    }, 5000);

    return () => {
      clearTimeout(authTimer);
    };
  }, [restoreSession]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Animated Glow Background */}
          <Animated.View
            style={[
              styles.glowContainer,
              {
                opacity: glowOpacity,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.glow} />
          </Animated.View>

          {/* Logo Container */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: Animated.multiply(scaleAnim, pulseAnim) },
                ],
              },
            ]}
          >
            <Image
              source={require('../assets/splash-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* App Name */}
          <Animated.Text
            style={[
              styles.appName,
              {
                opacity: textFadeAnim,
              },
            ]}
          >
            AdsBarter
          </Animated.Text>

          {/* Tagline */}
          <Animated.Text
            style={[
              styles.tagline,
              {
                opacity: taglineFadeAnim,
              },
            ]}
          >
            Connect. Promote. Grow
          </Animated.Text>

          {/* Loading Dots */}
          <Animated.View
            style={[
              styles.loadingContainer,
              {
                opacity: taglineFadeAnim,
              },
            ]}
          >
            <View style={styles.dotContainer}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  glowContainer: {
    position: 'absolute',
    width: 300,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(70, 79, 229, 0.3)',
    shadowColor: '#464FE5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 20,
  },
  logoContainer: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 2,
    textShadowColor: 'rgba(70, 79, 229, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '400',
    color: '#B8B8D1',
    marginBottom: 40,
    letterSpacing: 1,
  },
  loadingContainer: {
    marginTop: 20,
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#464FE5',
    marginHorizontal: 5,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
});

export default SplashScreen;


