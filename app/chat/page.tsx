'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import { auth } from './firebaseConfig'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { db } from './firebasefirestore'
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

// Génère automatiquement les chemins d'image pour chaque plante
const generatePlantStages = (plant: string) => [
  `/plants/${plant}/1.svg`,
  `/plants/${plant}/2.svg`,
  `/plants/${plant}/3.svg`
]

const PLANTS = [
  { value: 'fig', label: 'Figuier', imgStages: generatePlantStages('fig') },
  { value: 'tomato', label: 'Tomates', imgStages: generatePlantStages('tomato') },
  { value: 'salad', label: 'Salade Boston', imgStages: generatePlantStages('salad') },
]

// Tes questions de quiz par défaut (Firestore viendra plus tard)
const levels = [
  {
    level: 1,
    questions: [
      {
        question: 'What is the ideal temperature for growing tomatoes in a greenhouse?',
        options: ['18-22°C', '25-30°C', '10-15°C'],
        correct: '18-22°C',
      },
      {
        question: 'What is the optimal relative humidity for tomatoes in a greenhouse?',
        options: ['40-50%', '60-70%', '80-90%'],
        correct: '60-70%',
      }
    ],
    tasks: ['Water your plant', 'Check temperature']
  },
  {
    level: 2,
    questions: [
      {
        question: 'How many hours of light per day are recommended for tomato growth in a greenhouse?',
        options: ['6 hours', '12 hours', '16-18 hours'],
        correct: '16-18 hours',
      },
      {
        question: 'What is the best irrigation method for greenhouse tomatoes?',
        options: ['Manual watering', 'Drip irrigation', 'Overhead sprinkling'],
        correct: 'Drip irrigation',
      }
    ],
    tasks: ['Adjust lighting', 'Check irrigation']
  }
]

const LEVEL_COUNT = 13  // Affiche 13 niveaux pour l’exemple, change ce chiffre selon ton besoin

export default function ChatGameLayout() {
  const [currentQ, setCurrentQ] = useState(0)
  const [xp, setXp] = useState(750)
  const [coins, setCoins] = useState(245)
  const [level, setLevel] = useState(1)
  const [feedback, setFeedback] = useState('')
  const [levelUpMsg, setLevelUpMsg] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [taskDone, setTaskDone] = useState(false)

  const [plantType, setPlantType] = useState('fig')
  const [growthStage, setGrowthStage] = useState(0)
  const plantConfig = PLANTS.find(p => p.value === plantType)

  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  const [audioCorrect, setAudioCorrect] = useState<HTMLAudioElement | null>(null)
  const [audioLevelUp, setAudioLevelUp] = useState<HTMLAudioElement | null>(null)

  const currentLevelData = levels.find(l => l.level === level)
  const questions = currentLevelData ? currentLevelData.questions : []
  const levelTasks = currentLevelData?.tasks || []

  // Simule la complétion des niveaux pour la démo
  const [completedLevels, setCompletedLevels] = useState<{[lvl: number]: boolean}>({})

  useEffect(() => {
    if (!user) return
    const loadUserData = async () => {
      const userRef = doc(db, "users", user.uid)
      const docSnap = await getDoc(userRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        setXp(data.xp ?? 0)
        setCoins(data.coins ?? 0)
        setLevel(data.level ?? 1)
        setTaskDone(data.taskDone ?? false)
        setCorrectCount(data.correctCount ?? 0)
        setWrongCount(data.wrongCount ?? 0)
        setCurrentQ(data.currentQ ?? 0)
        setPlantType(data.plantType ?? 'fig')
        setGrowthStage(data.growthStage ?? 0)
      } else {
        await setDoc(userRef, {
          xp, coins, level, taskDone, correctCount, wrongCount, currentQ, plantType, growthStage,
          lastTaskDate: new Date().toDateString(),
        })
      }
    }
    loadUserData()
  }, [user])

  useEffect(() => {
    if (!user) return
    const saveUserData = async () => {
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        xp, coins, level, taskDone, correctCount, wrongCount, currentQ, plantType, growthStage
      })
    }
    saveUserData()
  }, [xp, coins, level, taskDone, correctCount, wrongCount, currentQ, plantType, growthStage])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    try {
      setAudioCorrect(new Audio('/sounds/correct.mp3'))
      setAudioLevelUp(new Audio('/sounds/levelup.mp3'))
    } catch (err) { }
  }, [])

  useEffect(() => {
    setCurrentQ(0)
    setCorrectCount(0)
    setWrongCount(0)
  }, [level])

  useEffect(() => {
    if (xp >= 1000) {
      setCompletedLevels((prev) => ({...prev, [level]: true}))
      setLevel(prev => prev + 1)
      setXp(xp - 1000)
      setLevelUpMsg('🌟 Level Up!')
      audioLevelUp?.play()
      setTimeout(() => setLevelUpMsg(''), 2000)
    }
  }, [xp])

  useEffect(() => {
    const now = new Date().toDateString()
    const lastDate = localStorage.getItem('lastTaskDate')
    if (lastDate !== now) {
      setTaskDone(false)
      if (lastDate) setCoins(prev => Math.max(0, prev - 15))
    }
  }, [])

  const completeDailyTask = () => {
    setTaskDone(true)
    setGrowthStage(s => Math.min(s + 1, 2))
    localStorage.setItem('lastTaskDate', new Date().toDateString())
  }

  const handleAnswer = (selected: string) => {
    if (!questions.length) return

    const isCorrect = selected === questions[currentQ].correct
    if (isCorrect) {
      setXp(prev => prev + 50)
      setCoins(prev => prev + 10)
      setCorrectCount(count => count + 1)
      setFeedback('+50 XP, +10 GrowCoins ✅')
      audioCorrect?.play()
    } else {
      setWrongCount(count => count + 1)
      setFeedback('Incorrect ❌')
    }
  }

  const nextQuestion = () => {
    setFeedback('')
    setCurrentQ(prev => (prev + 1 < questions.length ? prev + 1 : prev))
  }

  const prevQuestion = () => {
    setFeedback('')
    setCurrentQ(prev => (prev - 1 >= 0 ? prev - 1 : prev))
  }

  const login = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
      alert('Successfully signed in!')
    } catch (error) {
      console.error("Erreur Firebase:", error)
      alert('Error during sign-in.')
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Erreur Firebase logout:", error)
    }
  }

  const renderLevelMenu = () => (
    <div className="mb-4 p-4 bg-white rounded-xl shadow">
      <div className="font-bold mb-2">Levels</div>
      <ul className="space-y-2">
        {Array.from({ length: LEVEL_COUNT }, (_, i) => {
          const l = i + 1
          // Couleur et texte pour le niveau 10
          if (l === 10) {
            return (
              <li key={l}>
                <button
                  className="w-full text-center px-4 py-2 rounded-lg font-bold shadow bg-orange-500 text-white border-2 border-orange-600 animate-pulse"
                  style={{letterSpacing: '1px'}}
                  disabled
                >
                  LEVEL 10 : LEARN TO EARN
                </button>
              </li>
            )
          }
          // Normal, complété, ou actif
          const isUnlocked = l <= level || (l <= 5 && !user)
          const isCurrent = l === level
          const isCompleted = completedLevels[l]
          return (
            <li key={l}>
              <button
                className={`w-full text-left px-4 py-2 rounded-lg font-semibold shadow ${
                  isCurrent
                    ? 'bg-green-300'
                    : isCompleted
                    ? 'bg-green-200 border-green-600 border-2'
                    : isUnlocked
                    ? 'bg-green-100 hover:bg-green-200'
                    : 'bg-gray-200 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (!isUnlocked) {
                    alert('Complétez les niveaux précédents.')
                  } else {
                    setLevel(l)
                  }
                }}
              >
                {isUnlocked ? (
                  <>
                    Level {l}{' '}
                    {isCompleted && <span className="ml-2 px-2 py-1 rounded text-xs bg-green-700 text-white">Niveau réussi</span>}
                  </>
                ) : (
                  <>🔒 Level {l}</>
                )}
              </button>
              {/* Zone d’info complétion */}
              {isCurrent && !isCompleted && (
                <div className="text-xs text-red-600 bg-red-50 p-2 mt-1 rounded">
                  {questions.length > 0
                    ? <>
                        Complete {(currentQ === 0 && !feedback) ? 0 : currentQ + 1} of {questions.length} – {Math.round((((currentQ === 0 && !feedback) ? 0 : currentQ + 1) / questions.length) * 100)}%<br />
                        {wrongCount} mistake{wrongCount !== 1 ? 's' : ''} – {correctCount} success<br />
                        Grade {questions.length > 0 ? Math.round((correctCount / ((currentQ === 0 && !feedback) ? 1 : currentQ + 1)) * 100) : 0}%
                     </>
                    : <>No question</>
                  }
                </div>
              )}
              {isCompleted && <div className="text-xs text-green-700 mt-1">Level - Completed</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )

  // ----------- UI PRINCIPALE COMPLÈTE -----------
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-200 to-blue-100 p-4">
      {/* Header */}
      <div className="bg-green-100 rounded-xl p-4 mb-4 flex justify-between items-center shadow max-w-6xl mx-auto">
        <div className="text-2xl font-bold text-green-800">MyGrowVerse</div>
        <div className="space-x-6 font-semibold">
          <span className="hover:underline cursor-pointer">Dashboard</span>
          <span className="hover:underline cursor-pointer">Tasks</span>
          <span className="hover:underline cursor-pointer">Community</span>
          <span className="hover:underline cursor-pointer">Settings</span>
        </div>
        <div>
          {user ? (
            <>
              <span className="mr-4 font-semibold text-green-800">{user.displayName}</span>
              <button
                onClick={logout}
                className="bg-red-400 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={login}
                className="bg-green-400 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold mr-2"
              >
                Login with Google
              </button>
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold">
                Create Account
              </button>
            </>
          )}
        </div>
      </div>

      {/* Layout à 5 colonnes aligné */}
      <div className="grid grid-cols-5 gap-6 max-w-6xl mx-auto">
        {/* Levels Sidebar */}
        <div className="col-span-1 flex flex-col">
          {renderLevelMenu()}
          <div className="mt-6 p-4 bg-white rounded-xl shadow">
            <div className="font-bold mb-2">Tasks for Level {level}</div>
            <ul className="list-disc list-inside text-sm">
              {levelTasks.map((task, i) => <li key={i}>{task}</li>)}
            </ul>
          </div>
        </div>

        {/* Section centrale */}
        <div className="col-span-3 flex flex-col items-center">
          <div className="w-full bg-white rounded-xl p-8 shadow flex flex-col items-center">

            {/* Menu déroulant pour choisir la plante */}
            <div className="mb-6 flex items-center gap-2">
              <label className="font-bold">Choisis ta plante :</label>
              <select
                className="p-2 rounded border"
                value={plantType}
                onChange={e => { setPlantType(e.target.value); setGrowthStage(0) }}
              >
                {PLANTS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* GrowBuddy - Animation de la plante */}
            <div className="mb-6 flex flex-col items-center">
              <img
                src={plantConfig?.imgStages[growthStage]}
                alt={plantConfig?.label}
                className="transition-all duration-700 w-36 h-36"
                style={{ filter: 'drop-shadow(0 4px 10px #8888)' }}
              />
              <div className="font-bold mt-2 text-green-600">
                {plantConfig?.label} Buddy
              </div>
              {/* Afficher la progression */}
              <div className="mt-2">
                Étape {Math.min(currentQ + 1, plantConfig?.imgStages.length || 1)} / {plantConfig?.imgStages.length}
              </div>
            </div>

            {/* Quiz & tâches */}
            {levelUpMsg && (
              <div className="text-2xl font-bold text-yellow-600 mb-2 animate-bounce">{levelUpMsg}</div>
            )}
            {questions.length > 0 && (
              <>
                <div className="font-bold text-xl mb-4 flex items-center gap-2" style={{ marginTop: '30px' }}>
                  <span role="img" aria-label="plant">🌱</span>
                  {questions[currentQ].question}
                </div>
                <div className="w-full flex flex-col gap-3">
                  {questions[currentQ].options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className="bg-blue-100 text-blue-800 font-semibold rounded-lg px-6 py-2 shadow hover:bg-blue-200 transition-colors border-2 border-transparent hover:border-blue-400"
                      disabled={!!feedback}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {feedback && (
                  <div className="mt-4 text-lg font-bold text-green-600 animate-pulse">
                    {feedback}
                  </div>
                )}
                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => {
                      setFeedback('');
                      setCurrentQ(prev => (prev - 1 >= 0 ? prev - 1 : prev));
                    }}
                    className={`bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 ${currentQ === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={currentQ === 0}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => {
                      setFeedback('');
                      setCurrentQ(prev => (prev + 1 < questions.length ? prev + 1 : prev));
                    }}
                    className={`bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 ${feedback !== '+50 XP, +10 GrowCoins ✅' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={feedback !== '+50 XP, +10 GrowCoins ✅' || currentQ === questions.length - 1}
                  >
                    Next →
                  </button>
                </div>

                {/* GrowBuddy tâche quotidienne */}
                <div className="mt-10 w-full bg-green-50 p-4 rounded-xl border border-green-200">
                  <div className="font-bold mb-2">Daily Task: GrowBuddy 🌿</div>
                  <p className="mb-2">{taskDone ? '✅ Done for today!' : '❗ Not done today. Lose 15 GrowCoins!'}</p>
                  <button
                    onClick={completeDailyTask}
                    disabled={taskDone}
                    className={`px-4 py-2 rounded-lg font-semibold text-white ${taskDone ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    Feed Plant
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar droite */}
        <div className="col-span-1 flex flex-col">
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <div className="font-bold text-lg mb-2 text-red-700">GrowCoin : {coins} GC</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 mb-2">
            <div className="font-bold mb-2">Shop GrowCoin</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-yellow-100 p-4 rounded text-center font-semibold shadow">Item 1</div>
              <div className="bg-yellow-100 p-4 rounded text-center font-semibold shadow">Item 2</div>
              <div className="bg-yellow-100 p-4 rounded text-center font-semibold shadow">Item 4</div>
              <div className="bg-yellow-100 p-4 rounded text-center font-semibold shadow">Item 5</div>
            </div>
          </div>
          {/* Advertising Space */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full h-64 border-4 border-orange-400 rounded-2xl flex items-center justify-center bg-white text-orange-500 font-semibold text-center" style={{minHeight: '200px'}}>
              Advertise here
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

