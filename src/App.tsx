import { Route, Routes } from 'react-router-dom'
import Shell from './components/layout/Shell'
import Home from './screens/Home'
import Stats from './screens/Stats'
import Profile from './screens/Profile'
import Settings from './screens/Settings'
import OnboardingWizard from './screens/onboarding/OnboardingWizard'
import CheckEmail from './screens/onboarding/CheckEmail'
import CompleteOnboarding from './screens/onboarding/CompleteOnboarding'
import { AppDataProvider } from './context/AppDataContext'

export default function App() {
  return (
    <AppDataProvider>
      <Routes>
        <Route path="/onboarding" element={<OnboardingWizard />} />
        <Route path="/onboarding/check-email" element={<CheckEmail />} />
        <Route path="/onboarding/complete" element={<CompleteOnboarding />} />
        <Route
          path="/"
          element={
            <Shell>
              <Home />
            </Shell>
          }
        />
        <Route
          path="/stats"
          element={
            <Shell>
              <Stats />
            </Shell>
          }
        />
        <Route
          path="/profile"
          element={
            <Shell>
              <Profile />
            </Shell>
          }
        />
        <Route
          path="/settings"
          element={
            <Shell>
              <Settings />
            </Shell>
          }
        />
      </Routes>
    </AppDataProvider>
  )
}
