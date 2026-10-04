import {useState} from 'react';
import{ 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StatusBar, 
  ScrollView,
  Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen({ onNavigateToSignIn }) {
  const [step, setStep] = useState('register');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');

  // 1. Generate 6-digit verification code
  const handleSendVerificationCode = () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    setGeneratedCode(code);
    setEnteredCode('');
    setStep('verify');

    Alert.alert(
      "Verification Code Sent",
      `A 6-digit code has been sent to ${email}.\n\nYour code is: ${code}`
    );
  };

  // 2. Verify code AND create account in backend
  const handleVerifyCode = async () => {
    // First check the verification code
    if (enteredCode !== generatedCode) {
      Alert.alert(
        "Error",
        "Invalid 6-digit code. Please try again."
      );
      return;
    }

    // Make sure the code is exactly 6 digits
    if (enteredCode.length !== 6) {
      Alert.alert(
        "Error",
        "Please enter the 6-digit verification code."
      );
      return;
    }

    try {
      // Send registration data to backend
      const response = await fetch(
  'https://ikonek-app.onrender.com/api/auth/register',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: fullName.trim(),
      email: email.trim().toLowerCase(),
      password: password,
    }),
  }
);

      // Read backend response
      const data = await response.json();

      console.log("REGISTER RESPONSE:", data);

      // Backend returned an error
      if (!response.ok) {
        Alert.alert(
          "Registration Failed",
          data.message || "Failed to create account."
        );
        return;
      }

      // Registration successful
      Alert.alert(
        "Success",
        "Account successfully created!",
        [
          {
            text: "OK",
            onPress: () => {
              if (typeof onNavigateToSignIn === 'function') {
                onNavigateToSignIn();
              }
            },
          },
        ]
      );

    } catch (error) {
      console.error("Registration error:", error);

      Alert.alert(
        "Connection Error",
        "Could not connect to the server. Make sure the backend is running."
      );
    }
  };

  // 3. Back to Sign In
  const handleBack = () => {
    if (typeof onNavigateToSignIn === 'function') {
      onNavigateToSignIn();
    }
  };

  // VERIFICATION STEP
  if (step === 'verify') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          
          <Text style={styles.title}>Enter Verification Code</Text>

          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {email}
          </Text>

          <Text style={styles.label}>6-Digit Code</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            maxLength={6}
            value={enteredCode}
            onChangeText={setEnteredCode}
          />

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleVerifyCode}
          >
            <Text style={styles.btnText}>
              Verify & Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backToSignContainer}
            onPress={handleBack}
          >
            <Text style={styles.backToSignText}>
              Back to Sign In
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    );
  }

  // REGISTRATION FORM
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        
        <Text style={styles.title}>Create Account</Text>

        <Text style={styles.label}>Full Name</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#64748B"
          value={fullName}
          onChangeText={setFullName}
        />

        <Text style={styles.label}>Email Address</Text>

        <TextInput
          style={styles.input}
          placeholder="example@gmail.com"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Enter your password"
            placeholderTextColor="#64748B"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Text>
              {showPassword ? "👁️" : "🙈"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm Password</Text>

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirm your password"
            placeholderTextColor="#64748B"
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
          >
            <Text>
              {showConfirmPassword ? "👁️" : "🙈"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleSendVerificationCode}
        >
          <Text style={styles.btnText}>
            Send Verification Code
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToSignContainer}
          onPress={handleBack}
        >
          <Text style={styles.backToSignText}>
            Back to Sign In
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0F172A' 
  },

  scrollContainer: { 
    paddingHorizontal: 24, 
    paddingVertical: 20 
  },

  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFF', 
    marginBottom: 8 
  },

  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 24
  },

  label: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: '600', 
    marginBottom: 8 
  },

  input: { 
    backgroundColor: '#1E293B', 
    borderWidth: 1, 
    borderColor: '#334155', 
    borderRadius: 8, 
    padding: 14, 
    color: '#FFF', 
    fontSize: 14, 
    marginBottom: 16 
  },

  passwordWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1E293B', 
    borderWidth: 1, 
    borderColor: '#334155', 
    borderRadius: 8, 
    marginBottom: 16, 
    paddingHorizontal: 4 
  },

  passwordInput: { 
    flex: 1, 
    color: '#FFF', 
    padding: 14, 
    fontSize: 14 
  },

  eyeIcon: { 
    paddingHorizontal: 12 
  },

  primaryBtn: { 
    backgroundColor: '#2563EB', 
    paddingVertical: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 20 
  },

  btnText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },

  backToSignContainer: { 
    alignItems: 'center', 
    paddingVertical: 10 
  },

  backToSignText: { 
    color: '#38BDF8', 
    fontSize: 14, 
    fontWeight: '600',
    textDecorationLine: 'underline' 
  }
});