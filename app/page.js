'use client';

import { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button, Modal, TextField, Card, CardContent, Divider, AppBar, Toolbar } from '@mui/material';
import { firestore, auth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import axios from 'axios';

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
};

const buttonStyle = {
  borderRadius: 4,
  padding: '10px 20px',
};

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openSignUpModal, setOpenSignUpModal] = useState(false);
  const [openSignInModal, setOpenSignInModal] = useState(false);
  const [openRecipeModal, setOpenRecipeModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [minQuantity, setMinQuantity] = useState(0);
  const [vendorFilter, setVendorFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [currentItem, setCurrentItem] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [user, setUser] = useState(null);
  const [suggestedRecipes, setSuggestedRecipes] = useState([]);

  const updateInventory = async () => {
    try {
      const snapshot = query(collection(firestore, 'inventory'));
      const docs = await getDocs(snapshot);
      const inventoryList = [];
      docs.forEach((doc) => {
        inventoryList.push({ name: doc.id, ...doc.data() });
      });
      setInventory(inventoryList);
      setFilteredInventory(inventoryList);
    } catch (error) {
      console.error('Error fetching inventory:', error.message);
    }
  };

  useEffect(() => {
    updateInventory();
  }, []);

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
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const addItem = async () => {
    try {
      const docRef = doc(collection(firestore, 'inventory'), itemName);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity: currentQuantity } = docSnap.data();
        await setDoc(docRef, { quantity: currentQuantity + quantity, description, vendor });
      } else {
        await setDoc(docRef, { quantity, description, vendor });
      }
      await updateInventory();
      setItemName('');
      setQuantity(1);
      setDescription('');
      setVendor('');
      handleCloseAdd();
    } catch (error) {
      console.error('Error adding item:', error.message);
    }
  };

  const updateItem = async () => {
    try {
      const docRef = doc(collection(firestore, 'inventory'), currentItem.name);
      await setDoc(docRef, { quantity });
      await updateInventory();
      setOpenEditModal(false);
    } catch (error) {
      console.error('Error updating item:', error.message);
    }
  };

  const removeItem = async (item) => {
    try {
      const docRef = doc(collection(firestore, 'inventory'), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        if (quantity === 1) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, { quantity: quantity - 1 });
        }
      }
      await updateInventory();
    } catch (error) {
      console.error('Error removing item:', error.message);
    }
  };

  const handleOpenAdd = () => setOpenAddModal(true);
  const handleCloseAdd = () => setOpenAddModal(false);
  const handleOpenEdit = (item) => {
    setCurrentItem(item);
    setQuantity(item.quantity);
    setOpenEditModal(true);
  };
  const handleCloseEdit = () => setOpenEditModal(false);

  const handleOpenSignUp = () => setOpenSignUpModal(true);
  const handleCloseSignUp = () => setOpenSignUpModal(false);
  const handleOpenSignIn = () => setOpenSignInModal(true);
  const handleCloseSignIn = () => setOpenSignInModal(false);
  const handleOpenRecipeModal = () => setOpenRecipeModal(true);
  const handleCloseRecipeModal = () => setOpenRecipeModal(false);

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: username });
      alert('Sign Up Successful');
      handleCloseSignUp();
    } catch (error) {
      console.error('Error signing up:', error.message);
      alert(error.message);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert('Sign In Successful');
      handleCloseSignIn();
    } catch (error) {
      console.error('Error signing in:', error.message);
      alert(error.message);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      alert('Sign Out Successful');
    } catch (error) {
      console.error('Error signing out:', error.message);
      alert(error.message);
    }
  };

  const handleSuggestRecipe = async () => {
    const inventoryItems = inventory.map(item => `${item.name} (Quantity: ${item.quantity})`).join(', ');

    const prompt = `
      Based on the following pantry items, suggest some recipes that can be prepared and estimate the time it would take to create them:
      ${inventoryItems}
    `;

    try {
      const response = await axios.post('https://api.openai.com/v1/completions', {
        model: 'text-davinci-003',
        prompt: prompt,
        max_tokens: 150
      }, {
        headers: {
          'Authorization': `Bearer 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`,
          'Content-Type': 'application/json'
        }
      });

      const suggestedRecipes = response.data.choices[0].text.trim();
      setSuggestedRecipes(suggestedRecipes);
      handleOpenRecipeModal();
    } catch (error) {
      console.error('Error suggesting recipes:', error.message);
    }
  };

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
          <Button color="inherit" onClick={handleSuggestRecipe}>Suggest Recipe</Button>
        </Toolbar>
      </AppBar>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <TextField
          label="Min Quantity"
          type="number"
          value={minQuantity}
          onChange={(e) => setMinQuantity(parseInt(e.target.value))}
        />
        <TextField
          label="Vendor"
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
        />
        <TextField
          label="Description"
          value={descriptionFilter}
          onChange={(e) => setDescriptionFilter(e.target.value)}
        />
      </Stack>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={handleOpenAdd}>Add Item</Button>
      </Stack>
      <Stack
        spacing={2}
        sx={{
          width: '100%',
          maxHeight: '50vh',
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: '0.4em' },
          '&::-webkit-scrollbar-track': { boxShadow: 'inset 0 0 6px rgba(0,0,0,0.3)' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'darkgrey', outline: '1px solid slategrey' },
        }}
      >
        {filteredInventory.map((item) => (
          <Card key={item.name}>
            <CardContent>
              <Typography variant="h6">{item.name}</Typography>
              <Typography>Quantity: {item.quantity}</Typography>
              <Typography>Description: {item.description}</Typography>
              <Typography>Vendor: {item.vendor}</Typography>
              <Button variant="outlined" onClick={() => handleOpenEdit(item)}>Edit</Button>
              <Button variant="outlined" onClick={() => removeItem(item.name)}>Remove</Button>
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Modal open={openAddModal} onClose={handleCloseAdd}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Add Item</Typography>
          <TextField label="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <TextField label="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          <Button variant="contained" onClick={addItem}>Add</Button>
        </Box>
      </Modal>
      <Modal open={openEditModal} onClose={handleCloseEdit}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Edit Item</Typography>
          <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value))} />
          <Button variant="contained" onClick={updateItem}>Update</Button>
        </Box>
      </Modal>
      <Modal open={openSignUpModal} onClose={handleCloseSignUp}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sign Up</Typography>
          <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="contained" onClick={handleSignUp}>Sign Up</Button>
        </Box>
      </Modal>
      <Modal open={openSignInModal} onClose={handleCloseSignIn}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Sign In</Typography>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button variant="contained" onClick={handleSignIn}>Sign In</Button>
        </Box>
      </Modal>
      <Modal open={openRecipeModal} onClose={handleCloseRecipeModal}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Suggested Recipes</Typography>
          {suggestedRecipes.map((recipe, index) => (
            <Typography key={index}>{recipe}</Typography>
          ))}
        </Box>
      </Modal>
    </Box>
  );
}
