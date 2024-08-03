'use client'

import { useState, useEffect } from 'react'
import { Box, Stack, Typography, Button, Modal, TextField, Card, CardContent, Divider } from '@mui/material'
import { firestore } from '@/firebase'
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore'

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
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [minQuantity, setMinQuantity] = useState(0)
  const [currentItem, setCurrentItem] = useState(null)

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
    const filtered = inventory.filter(({ name, quantity }) =>
      name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      quantity >= minQuantity
    )
    setFilteredInventory(filtered)
  }, [searchTerm, minQuantity, inventory])

  const addItem = async (item) => {
    const docRef = doc(collection(firestore, 'inventory'), item)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const { quantity: currentQuantity } = docSnap.data()
      await setDoc(docRef, { quantity: currentQuantity + quantity })
    } else {
      await setDoc(docRef, { quantity })
    }
    await updateInventory()
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

  return (
    <Box
      width="100vw"
      height="100vh"
      display={'flex'}
      justifyContent={'center'}
      flexDirection={'column'}
      alignItems={'center'}
      gap={3}
      p={3}
      bgcolor={'#e0f7fa'}  // Light cyan background
    >
      {/* Add Item Modal */}
      <Modal
        open={openAddModal}
        onClose={handleCloseAdd}
        aria-labelledby="modal-add-item-title"
        aria-describedby="modal-add-item-description"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-add-item-title" variant="h6" component="h2" color="#00796b">
            Add New Item
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <TextField
              label="Item Name"
              variant="outlined"
              fullWidth
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
            <TextField
              type="number"
              label="Quantity"
              variant="outlined"
              fullWidth
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <Button
              variant="contained"
              color="primary"
              sx={buttonStyle}
              onClick={() => {
                addItem(itemName)
                setItemName('')
                setQuantity(1)
                handleCloseAdd()
              }}
            >
              Add
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        open={openEditModal}
        onClose={handleCloseEdit}
        aria-labelledby="modal-edit-item-title"
        aria-describedby="modal-edit-item-description"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-edit-item-title" variant="h6" component="h2" color="#00796b">
            Edit Item Quantity
          </Typography>
          <Divider sx={{ mb: 2, bgcolor: '#00796b' }} />
          <Stack spacing={2}>
            <Typography variant="h6" color="#00796b">
              {currentItem?.name.charAt(0).toUpperCase() + currentItem?.name.slice(1)}
            </Typography>
            <TextField
              type="number"
              label="Quantity"
              variant="outlined"
              fullWidth
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <Button
              variant="contained"
              color="success"
              sx={buttonStyle}
              onClick={updateItem}
            >
              Update
            </Button>
          </Stack>
        </Box>
      </Modal>

      <Button variant="contained" color="primary" sx={buttonStyle} onClick={handleOpenAdd}>
        Add New Item
      </Button>

      <Box width="800px" marginTop={2} padding={3} bgcolor={'#ffffff'} borderRadius={2} boxShadow={2}>
        <Typography variant="h6" color={'#00796b'} mb={2}>
          Filter Items
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Search Item"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <TextField
            type="number"
            label="Minimum Quantity"
            variant="outlined"
            fullWidth
            value={minQuantity}
            onChange={(e) => setMinQuantity(Number(e.target.value))}
          />
        </Stack>
      </Box>

      <Box width="800px" marginTop={3} borderRadius={2} overflow={'auto'}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h4" color={'#00796b'} textAlign={'center'} mb={2}>
              Inventory Items
            </Typography>
            <Stack spacing={2}>
              {filteredInventory.map(({ name, quantity }) => (
                <Card key={name} variant="outlined" sx={{ mb: 1 }}>
                  <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant={'h6'} color={'#00796b'}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </Typography>
                    <Typography variant={'h6'} color={'#00796b'}>
                      Quantity: {quantity}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" color="warning" sx={buttonStyle} onClick={() => handleOpenEdit({ name, quantity })}>
                        Edit
                      </Button>
                      <Button variant="contained" color="error" sx={buttonStyle} onClick={() => removeItem(name)}>
                        Remove
                      </Button>
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
