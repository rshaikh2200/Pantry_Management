// app/page.js
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
      setUser(userCredential.user)
      handleCloseSignUp()
    } catch (error) {
      console.error('Error signing up:', error.message)
    }
  }

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      setUser(userCredential.user)
      handleCloseSignIn()
    } catch (error) {
      console.error('Error signing in:', error.message)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error.message)
    }
  }

  const handleRecipeSuggestion = () => {
    fetchRecipeSuggestions();
    setOpenRecipeModal(true)
  }

  const handleCloseRecipe = () => setOpenRecipeModal(false)

  return (
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            Inventory Management
          </Typography>
          {user ? (
            <div>
              <Button color="inherit" onClick={handleSignOut}>
                Sign Out
              </Button>
              <Button color="inherit" onClick={handleRecipeSuggestion}>
                Suggest Recipe
              </Button>
            </div>
          ) : (
            <div>
              <Button color="inherit" onClick={handleOpenSignUp}>
                Sign Up
              </Button>
              <Button color="inherit" onClick={handleOpenSignIn}>
                Sign In
              </Button>
            </div>
          )}
        </Toolbar>
      </AppBar>
      <Box p={3}>
        <Stack direction="row" spacing={2}>
          <TextField label="Search" variant="outlined" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <TextField
            label="Min Quantity"
            type="number"
            variant="outlined"
            value={minQuantity}
            onChange={(e) => setMinQuantity(Number(e.target.value))}
          />
          <TextField label="Vendor" variant="outlined" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} />
          <TextField label="Description" variant="outlined" value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} />
          <Button variant="contained" color="primary" onClick={handleOpenAdd} style={buttonStyle}>
            Add Item
          </Button>
        </Stack>
        <Divider style={{ margin: '20px 0' }} />
        <Stack direction="column" spacing={2}>
          {filteredInventory.map((item) => (
            <Card key={item.name}>
              <CardContent>
                <Typography variant="h6">{item.name}</Typography>
                <Typography>Quantity: {item.quantity}</Typography>
                <Typography>Description: {item.description}</Typography>
                <Typography>Vendor: {item.vendor}</Typography>
                <Button variant="contained" color="primary" onClick={() => handleOpenEdit(item)} style={buttonStyle}>
                  Edit
                </Button>
                <Button variant="contained" color="secondary" onClick={() => removeItem(item.name)} style={buttonStyle}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
      <Modal open={openAddModal} onClose={handleCloseAdd}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Add Item</Typography>
          <TextField label="Item Name" variant="outlined" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <TextField
            label="Quantity"
            type="number"
            variant="outlined"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <TextField label="Description" variant="outlined" value={description} onChange={(e) => setDescription(e.target.value)} />
          <TextField label="Vendor" variant="outlined" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          <Button variant="contained" color="primary" onClick={addItem} style={buttonStyle}>
            Add
          </Button>
        </Box>
      </Modal>
      <Modal open={openEditModal} onClose={handleCloseEdit}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Edit Item</Typography>
          <TextField
            label="Quantity"
            type="number"
            variant="outlined"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <Button variant="contained" color="primary" onClick={updateItem} style={buttonStyle}>
            Update
          </Button>
        </Box>
      </Modal>
      <Modal open={openSignUpModal} onClose={handleCloseSignUp}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sign Up</Typography>
          <TextField label="Username" variant="outlined" value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField label="Email" variant="outlined" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={handleSignUp} style={buttonStyle}>
            Sign Up
          </Button>
        </Box>
      </Modal>
      <Modal open={openSignInModal} onClose={handleCloseSignIn}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sign In</Typography>
          <TextField label="Email" variant="outlined" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={handleSignIn} style={buttonStyle}>
            Sign In
          </Button>
        </Box>
      </Modal>
      <Modal open={openRecipeModal} onClose={handleCloseRecipe}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Recipe Suggestions</Typography>
          <pre>{recipes}</pre>
          <Button variant="contained" color="primary" onClick={handleCloseRecipe} style={buttonStyle}>
            Close
          </Button>
        </Box>
      </Modal>
    </div>
  )
}
