'use client'

import { useState, useEffect } from 'react'
import { Box, Stack, Typography, Button, Modal, TextField, Card, CardContent, Divider, AppBar, Toolbar } from '@mui/material'
import { firestore, auth } from '@/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from 'firebase/firestore'


const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#ffffff',
  borderRadius: 4,
  boxShadow: 4,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
}

const buttonStyle = {
  borderRadius: 4,
  padding: '10px 20px',
}

export default function Home() {
  const [inventory, setInventory] = useState([])
  const [filteredInventory, setFilteredInventory] = useState([])
  const [openAddModal, setOpenAddModal] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [openSignUpModal, setOpenSignUpModal] = useState(false)
  const [openSignInModal, setOpenSignInModal] = useState(false)
  const [openRecipeModal, setOpenRecipeModal] = useState(false) // Added state for recipe modal
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [description, setDescription] = useState('')
  const [vendor, setVendor] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [minQuantity, setMinQuantity] = useState(0)
  const [vendorFilter, setVendorFilter] = useState('')
  const [descriptionFilter, setDescriptionFilter] = useState('')
  const [currentItem, setCurrentItem] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [user, setUser] = useState(null)
  const [prompt, setPrompt] = useState<string>("")
  const [recipes, setRecipes] = useState<any[]>([])

  const updateInventory = async () => {
    try {
      const snapshot = query(collection(firestore, 'inventory'))
      const docs = await getDocs(snapshot)
      const inventoryList = []
      docs.forEach((doc) => {
        inventoryList.push({ name: doc.id, ...doc.data() })
      })
      setInventory(inventoryList)
      setFilteredInventory(inventoryList)
      await fetchRecipeSuggestions(inventoryList)
    } catch (error) {
      console.error('Error fetching inventory:', error.message)
    }
  }

  useEffect(() => {
    updateInventory()
  }, [])

  useEffect(() => {
    const filtered = inventory.filter((item) => {
      const itemName = item?.name?.toLowerCase() || ''
      const itemDescription = item?.description?.toLowerCase() || ''
      const itemVendor = item?.vendor?.toLowerCase() || ''
      return (
        itemName.includes(searchTerm.toLowerCase()) &&
        itemDescription.includes(descriptionFilter.toLowerCase()) &&
        itemVendor.includes(vendorFilter.toLowerCase()) &&
        item?.quantity >= minQuantity
      )
    })
    setFilteredInventory(filtered)
  }, [searchTerm, minQuantity, vendorFilter, descriptionFilter, inventory])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        setUser(null)
      }
    })
    return () => unsubscribe()
  }, [])

  const addItem = async () => {
    try {
      const docRef = doc(collection(firestore, 'inventory'), itemName)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const { quantity: currentQuantity } = docSnap.data()
        await setDoc(docRef, { quantity: currentQuantity + quantity, description, vendor })
      } else {
        await setDoc(docRef, { quantity, description, vendor })
      }
      await updateInventory()
      setItemName('')
      setQuantity(1)
      setDescription('')
      setVendor('')
      handleCloseAdd()
    } catch (error) {
      console.error('Error adding item:', error.message)
    }
  }

  const updateItem = async () => {
    try {
      const docRef = doc(collection(firestore, 'inventory'), currentItem.name)
      await setDoc(docRef, { quantity })
      await updateInventory()
      setOpenEditModal(false)
    } catch (error) {
      console.error('Error updating item:', error.message)
    }
  }

  const removeItem = async (item) => {
    try {
      const docRef = doc(collection(firestore, 'inventory'), item)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const { quantity } = docSnap.data()
        if (quantity === 1) {
          await deleteDoc(docRef)
        } else {
          await setDoc(docRef, { quantity: quantity - 1 })
        }
      }
      await updateInventory()
    } catch (error) {
      console.error('Error removing item:', error.message)
    }
  }

  const handleOpenAdd = () => setOpenAddModal(true)
  const handleCloseAdd = () => setOpenAddModal(false)
  const handleOpenEdit = (item) => {
    setCurrentItem(item)
    setQuantity(item.quantity)
    setOpenEditModal(true)
  }
  const handleCloseEdit = () => setOpenEditModal(false)

  const handleOpenSignUp = () => setOpenSignUpModal(true)
  const handleCloseSignUp = () => setOpenSignUpModal(false)
  const handleOpenSignIn = () => setOpenSignInModal(true)
  const handleCloseSignIn = () => setOpenSignInModal(false)

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(userCredential.user, { displayName: username })
      alert('Sign Up Successful')
      handleCloseSignUp()
    } catch (error) {
      console.error('Error signing up:', error.message)
      alert(error.message)
    }
  }

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      alert('Sign In Successful')
      handleCloseSignIn()
    } catch (error) {
      console.error('Error signing in:', error.message)
      alert(error.message)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      alert('Sign Out Successful')
    } catch (error) {
      console.error('Error signing out:', error.message)
      alert(error.message)
    }
  }

  const handleOpenRecipeModal = () => setOpenRecipeModal(true) // Function to open recipe modal
  const handleCloseRecipeModal = () => setOpenRecipeModal(false) // Function to close recipe modal

  const fetchRecipeSuggestions = async (inventoryList) => {
    // Add your logic to fetch recipe suggestions here
    const suggestions = "Sample recipe suggestion based on inventory." // Replace with actual logic
    setRecipes(suggestions)
  }

  return (
    <Box width="100vw" height="100vh" display="flex" flexDirection="column" alignItems="center" gap={3} p={3} bgcolor="#e0f7fa">
      <AppBar position="static">
        <Toolbar>
          {user ? (
            <>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Welcome, {user.displayName}
              </Typography>
              <Button color="inherit" onClick={handleSignOut}>Logout</Button>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Welcome
              </Typography>
              <Button color="inherit" onClick={handleOpenSignUp}>Sign Up</Button>
              <Button color="inherit" onClick={handleOpenSignIn}>Sign In</Button>
            </>
          )}
          <Button color="inherit" onClick={handleOpenAdd}>Add Item</Button>
          <Button color="inherit" onClick={handleOpenRecipeModal}>Suggest Recipe</Button> {/* Added button */}
        </Toolbar>
      </AppBar>

      {/* Modals for Sign Up, Sign In, Add Item, Edit Item, and Recipe Suggestions */}
      <Modal open={openSignUpModal} onClose={handleCloseSignUp} aria-labelledby="modal-sign-up-title" aria-describedby="modal-sign-up-description">
        <Box sx={modalStyle}>
          <Typography id
