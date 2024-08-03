'use client'

import { useState, useEffect } from 'react'
import { Box, Stack, Typography, Button, Modal, TextField, Card, CardContent, Divider, AppBar, Toolbar } from '@mui/material'
import { firestore, auth } from '@/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile } from 'firebase/auth'
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
  const [vendorName, setVendorName] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [minQuantity, setMinQuantity] = useState(0)
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
        inventoryList.push({ id: doc.id, ...doc.data() })
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
    const filtered = inventory.filter(({ name, quantity, vendorName, itemDescription }) =>
      (name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemDescription.toLowerCase().includes(searchTerm.toLowerCase())) &&
      quantity >= minQuantity
    )
    setFilteredInventory(filtered)
  }, [searchTerm, minQuantity, inventory])

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
        await setDoc(docRef, { quantity: currentQuantity + quantity, vendorName, itemDescription }, { merge: true })
      } else {
        await setDoc(docRef, { quantity, vendorName, itemDescription })
      }
      await updateInventory()
      setItemName('')
      setQuantity(1)
      setVendorName('')
      setItemDescription('')
      handleCloseAdd()
    } catch (error) {
      console.error('Error adding item:', error.message)
    }
  }

  const updateItem = async () => {
    if (!currentItem) return
    try {
      const docRef = doc(collection(firestore, 'inventory'), currentItem.name)
      await setDoc(docRef, { quantity, vendorName: currentItem.vendorName, itemDescription: currentItem.itemDescription }, { merge: true })
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
          await setDoc(docRef, { quantity: quantity - 1 }, { merge: true })
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
    setVendorName(item.vendorName)
    setItemDescription(item.itemDescription)
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

  return (
    <Box width="100vw" height="100vh" display="flex" flexDirection="column" alignItems="center" gap={3} p={3} bgcolor="#e0f7fa">
      <AppBar position="static">
        <Toolbar>
          {user ? (
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Welcome, {user.displayName}
            </Typography>
          ) : (
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Welcome
            </Typography>
          )}
          <Button color="inherit" onClick={handleOpenSignUp}>Sign Up</Button>
          <Button color="inherit" onClick={handleOpenSignIn}>Sign In</Button>
          <Button color="inherit" onClick={handleOpenAdd}>Add Item</Button>
        </Toolbar>
      </AppBar>

      {/* Sign Up Modal */}
      <Modal open={openSignUpModal} onClose={handleCloseSignUp} aria-labelledby="modal-sign-up-title" aria-describedby="modal-sign-up-description">
        <Box sx={modalStyle}>
          <Typography id="modal-sign-up-title" variant="h6" component="h2" color="#00796b">
            Sign Up
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField label="Username" variant="outlined" fullWidth value={username} onChange={(e) => setUsername(e.target.value)} />
            <TextField label="Email" variant="outlined" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField type="password" label="Password" variant="outlined" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button variant="contained" color="primary" sx={buttonStyle} onClick={handleSignUp}>Sign Up</Button>
          </Stack>
        </Box>
      </Modal>

      {/* Sign In Modal */}
      <Modal open={openSignInModal} onClose={handleCloseSignIn} aria-labelledby="modal-sign-in-title" aria-describedby="modal-sign-in-description">
        <Box sx={modalStyle}>
          <Typography id="modal-sign-in-title" variant="h6" component="h2" color="#00796b">
            Sign In
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField label="Email" variant="outlined" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField type="password" label="Password" variant="outlined" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button variant="contained" color="primary" sx={buttonStyle} onClick={handleSignIn}>Sign In</Button>
          </Stack>
        </Box>
      </Modal>

      {/* Add Item Modal */}
      <Modal open={openAddModal} onClose={handleCloseAdd} aria-labelledby="modal-add-item-title" aria-describedby="modal-add-item-description">
        <Box sx={modalStyle}>
          <Typography id="modal-add-item-title" variant="h6" component="h2" color="#00796b">
            Add New Item
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField label="Item Name" variant="outlined" fullWidth value={itemName} onChange={(e) => setItemName(e.target.value)} />
            <TextField label="Vendor Name" variant="outlined" fullWidth value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            <TextField label="Item Description" variant="outlined" fullWidth value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
            <TextField type="number" label="Quantity" variant="outlined" fullWidth value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            <Button variant="contained" color="primary" sx={buttonStyle} onClick={addItem}>Add</Button>
          </Stack>
        </Box>
      </Modal>

      {/* Edit Item Modal */}
      <Modal open={openEditModal} onClose={handleCloseEdit} aria-labelledby="modal-edit-item-title" aria-describedby="modal-edit-item-description">
        <Box sx={modalStyle}>
          <Typography id="modal-edit-item-title" variant="h6" component="h2" color="#00796b">
            Edit Item
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <Typography variant="h6" color="#00796b">
              {currentItem?.name.charAt(0).toUpperCase() + currentItem?.name.slice(1)}
            </Typography>
            <TextField label="Vendor Name" variant="outlined" fullWidth value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
            <TextField label="Item Description" variant="outlined" fullWidth value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
            <TextField type="number" label="Quantity" variant="outlined" fullWidth value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            <Button variant="contained" color="success" sx={buttonStyle} onClick={updateItem}>Update</Button>
          </Stack>
        </Box>
      </Modal>

      <Box width="800px" marginTop={2} padding={3} bgcolor="#ffffff" borderRadius={2} boxShadow={2}>
        <Typography variant="h6" color="#00796b" mb={2}>
          Filter Items
        </Typography>
        <Stack spacing={2}>
          <TextField label="Search (Item Name, Vendor Name, Description)" variant="outlined" fullWidth value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <TextField type="number" label="Minimum Quantity" variant="outlined" fullWidth value={minQuantity} onChange={(e) => setMinQuantity(Number(e.target.value))} />
        </Stack>
      </Box>

      <Box width="800px" marginTop={3} borderRadius={2} overflow="auto">
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h4" color="#00796b" textAlign="center" mb={2}>
              Inventory Items
            </Typography>
            <Stack spacing={2}>
              {filteredInventory.map(({ id, quantity, vendorName, itemDescription }) => (
                <Card key={id} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Stack spacing={1}>
                      <Typography variant="h6" color="#00796b">
                        {id.charAt(0).toUpperCase() + id.slice(1)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Vendor: {vendorName}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Description: {itemDescription}
                      </Typography>
                    </Stack>
                    <Typography variant="h6" color="#00796b">
                      Quantity: {quantity}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" color="warning" sx={buttonStyle} onClick={() => handleOpenEdit({ id, quantity, vendorName, itemDescription })}>Edit</Button>
                      <Button variant="contained" color="error" sx={buttonStyle} onClick={() => removeItem(id)}>Remove</Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}




