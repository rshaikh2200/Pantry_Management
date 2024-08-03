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
    const snapshot = query(collection(firestore, 'inventory'))
    const docs = await getDocs(snapshot)
    const inventoryList = []
    docs.forEach((doc) => {
      inventoryList.push({ name: doc.id, ...doc.data() })
    })
    setInventory(inventoryList)
    setFilteredInventory(inventoryList)
  }

  useEffect(() => {
    updateInventory()
  }, [])

  useEffect(() => {
    const filtered = inventory.filter(({ name, quantity, description, vendor }) =>
      name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      description.toLowerCase().includes(descriptionFilter.toLowerCase()) &&
      vendor.toLowerCase().includes(vendorFilter.toLowerCase()) &&
      quantity >= minQuantity
    )
    setFilteredInventory(filtered)
  }, [searchTerm, minQuantity, vendorFilter, descriptionFilter, inventory])

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
      } else {
        setUser(null)
      }
    })
  }, [])

  const addItem = async () => {
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
  }

  const updateItem = async () => {
    const docRef = doc(collection(firestore, 'inventory'), currentItem.name)
    await setDoc(docRef, { quantity })
    await updateInventory()
    setOpenEditModal(false)
  }

  const removeItem = async (item) => {
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
            <TextField label="Email" variant="outlined" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField type="password" label="Password" variant="outlined" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button variant="contained" color="primary" sx={buttonStyle} onClick={handleSignUp}>Sign Up</Button>
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
            <TextField label="Email" variant="outlined" fullWidth value={email} onChange={(e) => setEmail(e.target.value)} />
            <TextField type="password" label="Password" variant="outlined" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button variant="contained" color="primary" sx={buttonStyle} onClick={handleSignIn}>Sign In</Button>
          </Stack>
        </Box>
      </Modal>

      <Modal open={openAddModal} onClose={handleCloseAdd} aria-labelledby="modal-add-item-title" aria-describedby="modal-add-item-description">
        <Box sx={modalStyle}>
          <Typography id="modal-add-item-title" variant="h6" component="h2" color="#00796b">
            Add New Item
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField label="Item Name" variant="outlined" fullWidth value={itemName} onChange={(e) => setItemName(e.target.value)} />
            <TextField label="Quantity" type="number" variant="outlined" fullWidth value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} />
            <TextField label="Description" variant="outlined" fullWidth value={description} onChange={(e) => setDescription(e.target.value)} />
            <TextField label="Vendor" variant="outlined" fullWidth value={vendor} onChange={(e) => setVendor(e.target.value)} />
            <Button variant="contained" color="primary" sx={buttonStyle} onClick={addItem}>Add Item</Button>
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
            <TextField label="Item Name" variant="outlined" fullWidth value={currentItem?.name} disabled />
            <TextField label="Quantity" type="number" variant="outlined" fullWidth value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} />
            <Button variant="contained" color="primary" sx={buttonStyle} onClick={updateItem}>Update Item</Button>
          </Stack>
        </Box>
      </Modal>

      <Box display="flex" flexDirection="column" gap={2} width="100%" flexGrow={1} maxHeight="70vh" overflowY="auto">
        <Typography variant="h5" component="div" color="#00796b" sx={{ mb: 2 }}>
          Inventory Items
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField label="Search Item" variant="outlined" fullWidth value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <TextField label="Min Quantity" type="number" variant="outlined" value={minQuantity} onChange={(e) => setMinQuantity(parseInt(e.target.value))} />
          <TextField label="Vendor" variant="outlined" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)} />
          <TextField label="Description" variant="outlined" value={descriptionFilter} onChange={(e) => setDescriptionFilter(e.target.value)} />
        </Stack>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: '60vh' }}>
          {filteredInventory.map((item) => (
            <Card key={item.name} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" component="div">
                  {item.name}
                </Typography>
                <Typography color="text.secondary">
                  Quantity: {item.quantity}
                </Typography>
                <Typography color="text.secondary">
                  Description: {item.description}
                </Typography>
                <Typography color="text.secondary">
                  Vendor: {item.vendor}
                </Typography>
                <Stack direction="row" spacing={2} mt={2}>
                  <Button variant="contained" color="primary" onClick={() => handleOpenEdit(item)}>Edit</Button>
                  <Button variant="contained" color="secondary" onClick={() => removeItem(item.name)}>Remove</Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      <Box component="footer" sx={{ width: '100%', p: 2, mt: 'auto', bgcolor: '#00796b', color: '#ffffff', display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2">
          © {new Date().getFullYear()} Property of Rizwan's Company
        </Typography>
        <Typography variant="body2">
          Name: Rizwan Shaikh | Phone: (404) 980-4465 | Address: 123 Main St, Anytown, USA
        </Typography>
      </Box>
    </Box>
  )
}
