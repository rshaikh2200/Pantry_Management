'use client'

import { useState, useEffect } from 'react'
import { Box, Stack, Typography, Button, Modal, TextField, Card, CardContent, Divider, AppBar, Toolbar } from '@mui/material'
import { firestore, auth } from '@/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from "dotenv";

dotenv.config();

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
  const [recipeSuggestions, setRecipeSuggestions] = useState('')

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
    } catch (error) {
      console.error('Error updating inventory:', error.message)
    }
  }

  useEffect(() => {
    updateInventory()
  }, [])

  useEffect(() => {
    const filtered = inventory.filter((item) => {
      const itemName = item?.name?.toLowerCase() || '';
      const itemDescription = item?.description?.toLowerCase() || '';
      const itemVendor = item?.vendor?.toLowerCase() || '';
      return (
        itemName.includes(searchTerm.toLowerCase()) &&
        itemDescription.includes(descriptionFilter.toLowerCase()) &&
        itemVendor.includes(vendorFilter.toLowerCase()) &&
        item?.quantity >= minQuantity
      );
    });
    setFilteredInventory(filtered);
  }, [searchTerm, minQuantity, vendorFilter, descriptionFilter, inventory]);

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

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

  async function getIngredients() {
    const inventorySnapshot = await getDocs(collection(firestore, 'inventory'));
    const ingredients = inventorySnapshot.docs.map(doc => doc.data().name);
    return ingredients;
  }

  async function run() {
    // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Fetch ingredients from Firestore
    const ingredients = await getIngredients();
    const prompt = `Suggest a recipe using the following ingredients: ${ingredients.join(', ')}.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    setRecipeSuggestions(text);
  }

  useEffect(() => {
    run();
  }, []);

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
        </Toolbar>
      </AppBar>
      <Modal open={openSignUpModal} onClose={handleCloseSignUp} aria-labelledby="modal-sign-up-title" aria-describedby="modal-sign-up-description">
        <Box sx={modalStyle}>
          <Typography id="modal-sign-up-title" variant="h6" component="h2" color="#00796b">
            Sign Up
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField label="Username" variant="outlined" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField label="Email" type="email" variant="outlined" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Password" type="password" variant="outlined" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button sx={buttonStyle} variant="contained" color="primary" onClick={handleSignUp}>Sign Up</Button>
          </Stack>
        </Box>
      </Modal>

      <Modal open={openSignInModal} onClose={handleCloseSignIn} aria-labelledby="modal-sign-in-title" aria-describedby="modal-sign-in-description">
        <Box sx={modalStyle}>
          <Typography id="modal-sign-in-title" variant="h6" component="h2" color="#00796b">
            Sign In
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField label="Email" type="email" variant="outlined" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField label="Password" type="password" variant="outlined" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button sx={buttonStyle} variant="contained" color="primary" onClick={handleSignIn}>Sign In</Button>
          </Stack>
        </Box>
      </Modal>

      <Stack spacing={2} direction="row">
        <TextField label="Search Item" variant="outlined" fullWidth value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <TextField label="Min Quantity" type="number" variant="outlined" fullWidth value={minQuantity} onChange={(e) => setMinQuantity(Number(e.target.value))} />
        <TextField label="Vendor" variant="outlined" fullWidth value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} />
        <TextField label="Description" variant="outlined" fullWidth value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} />
      </Stack>

      <Stack spacing={2} direction="row" flexWrap="wrap">
        {filteredInventory.map((item, index) => (
          <Card key={index} sx={{ width: 250, bgcolor: '#e0f2f1', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" component="div" color="#00796b">
                {item.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Quantity: {item.quantity}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Vendor: {item.vendor}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Description: {item.description}
              </Typography>
            </CardContent>
            <Stack direction="row" spacing={1} sx={{ p: 1 }}>
              <Button size="small" color="primary" onClick={() => handleOpenEdit(item)}>Edit</Button>
              <Button size="small" color="secondary" onClick={() => removeItem(item.name)}>Remove</Button>
            </Stack>
          </Card>
        ))}
      </Stack>

      <Modal open={openAddModal} onClose={handleCloseAdd} aria-labelledby="modal-add-item-title" aria-describedby="modal-add-item-description">
        <Box sx={modalStyle}>
          <Typography id="modal-add-item-title" variant="h6" component="h2" color="#00796b">
            Add Item
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField label="Item Name" variant="outlined" fullWidth value={itemName} onChange={(e) => setItemName(e.target.value)} />
            <TextField label="Quantity" type="number" variant="outlined" fullWidth value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            <TextField label="Vendor" variant="outlined" fullWidth value={vendor} onChange={(e) => setVendor(e.target.value)} />
            <TextField label="Description" variant="outlined" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
            <Button sx={buttonStyle} variant="contained" color="primary" onClick={addItem}>Add Item</Button>
          </Stack>
        </Box>
      </Modal>

      <Modal open={openEditModal} onClose={handleCloseEdit} aria-labelledby="modal-edit-item-title" aria-describedby="modal-edit-item-description">
        <Box sx={modalStyle}>
          <Typography id="modal-edit-item-title" variant="h6" component="h2" color="#00796b">
            Edit Item
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField label="Item Name" variant="outlined" fullWidth value={currentItem?.name || ''} disabled />
            <TextField label="Quantity" type="number" variant="outlined" fullWidth value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            <Button sx={buttonStyle} variant="contained" color="primary" onClick={updateItem}>Update Item</Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  )
}



