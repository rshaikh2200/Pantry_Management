'use client'

import { useState, useEffect } from 'react'
import { Box, Stack, Typography, Button, Modal, TextField, Card, CardContent, Divider, AppBar, Toolbar } from '@mui/material'
import { firestore, auth } from '@/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import OpenAI from 'openai'

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

// Initialize OpenAI API client
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: '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', // Replace with your actual API key

})

export default function Home() {
  const [inventory, setInventory] = useState([])
  const [filteredInventory, setFilteredInventory] = useState([])
  const [openAddModal, setOpenAddModal] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [openSignUpModal, setOpenSignUpModal] = useState(false)
  const [openSignInModal, setOpenSignInModal] = useState(false)
  const [openRecipeModal, setOpenRecipeModal] = useState(false) // New state for recipe suggestions modal
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
      console.error('Error fetching inventory:', error.message)
    }
  }

  const fetchRecipeSuggestions = async (inventoryList) => {
    const items = inventoryList.map(item => ({
      name: item.name,
      quantity: item.quantity
    }));

    const prompt = 
      `Based on the following inventory ${items}, generate three recipes for a dish. The output should be in JSON array and each object should contain a recipe name filed name 'name', description filed name 'description', array of step by step instructions named 'instructions':\n
      ${JSON.stringify(items)}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      setRecipeSuggestions(response.choices[0].message.content.trim());
    } catch (error) {
      console.error('Error fetching recipe suggestions:', error.message);
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

  const handleOpenRecipeModal = () => {
    fetchRecipeSuggestions(filteredInventory) // Fetch recipe suggestions before opening modal
    setOpenRecipeModal(true) // Open recipe suggestions modal
  }
  const handleCloseRecipeModal = () => setOpenRecipeModal(false) // Close recipe suggestions modal

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Inventory Manager
          </Typography>
          <Button color="inherit" onClick={handleOpenRecipeModal}>Suggest Recipe</Button>
          {user ? (
            <Button color="inherit" onClick={handleSignOut}>Sign Out</Button>
          ) : (
            <>
              <Button color="inherit" onClick={handleOpenSignIn}>Sign In</Button>
              <Button color="inherit" onClick={handleOpenSignUp}>Sign Up</Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Recipe Suggestions Modal */}
      <Modal open={openRecipeModal} onClose={handleCloseRecipeModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Recipe Suggestions</Typography>
          <Card>
            <CardContent>
              <Typography variant="body2">{recipeSuggestions}</Typography>
            </CardContent>
          </Card>
          <Button variant="contained" sx={buttonStyle} onClick={handleCloseRecipeModal}>Close</Button>
        </Box>
      </Modal>

      {/* Add Item Modal */}
      <Modal open={openAddModal} onClose={handleCloseAdd}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Add Item</Typography>
          <TextField label="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} fullWidth />
          <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} fullWidth />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth />
          <TextField label="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} fullWidth />
          <Button variant="contained" sx={buttonStyle} onClick={addItem}>Add Item</Button>
        </Box>
      </Modal>

      {/* Edit Item Modal */}
      <Modal open={openEditModal} onClose={handleCloseEdit}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Edit Item</Typography>
          <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} fullWidth />
          <Button variant="contained" sx={buttonStyle} onClick={updateItem}>Update Item</Button>
        </Box>
      </Modal>

      {/* Sign Up Modal */}
      <Modal open={openSignUpModal} onClose={handleCloseSignUp}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sign Up</Typography>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
          <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth />
          <Button variant="contained" sx={buttonStyle} onClick={handleSignUp}>Sign Up</Button>
        </Box>
      </Modal>

      {/* Sign In Modal */}
      <Modal open={openSignInModal} onClose={handleCloseSignIn}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sign In</Typography>
          <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
          <Button variant="contained" sx={buttonStyle} onClick={handleSignIn}>Sign In</Button>
        </Box>
      </Modal>

      <Box sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h4">Inventory</Typography>
          <TextField label="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} fullWidth />
          <TextField label="Min Quantity" type="number" value={minQuantity} onChange={(e) => setMinQuantity(Number(e.target.value))} fullWidth />
          <TextField label="Vendor Filter" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} fullWidth />
          <TextField label="Description Filter" value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} fullWidth />
          <Stack spacing={2}>
            {filteredInventory.map((item) => (
              <Card key={item.name}>
                <CardContent>
                  <Typography variant="h6">{item.name}</Typography>
                  <Typography variant="body2">Quantity: {item.quantity}</Typography>
                  <Typography variant="body2">Description: {item.description}</Typography>
                  <Typography variant="body2">Vendor: {item.vendor}</Typography>
                  <Button variant="contained" color="error" onClick={() => removeItem(item.name)}>Remove</Button>
                  <Button variant="contained" onClick={() => handleOpenEdit(item)}>Edit</Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Stack>
      </Box>
    </>
  )
}

