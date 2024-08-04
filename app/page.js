'use client'

import { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button, Modal, TextField, Card, CardContent, Divider, AppBar, Toolbar } from '@mui/material';
import { firestore, auth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import Groq from 'groq-sdk';

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
  const [openRecipeModal, setOpenRecipeModal] = useState(false); // Added state for recipe modal
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
  const [recipeSuggestion, setRecipeSuggestion] = useState(''); // Added state for recipe suggestion

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

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
      console.error('Error updating inventory:', error.message);
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

  const fetchRecipeSuggestion = async () => {
    try {
      const params = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Suggest a recipe based on my pantry items.' },
        ],
        model: 'llama3-8b-8192',
      };

      const chatCompletion = await groq.chat.completions.create(params);
      setRecipeSuggestion(chatCompletion.choices[0].message.content); // Update state with response
      setOpenRecipeModal(true); // Open the recipe modal
    } catch (error) {
      console.error('Error fetching recipe suggestion:', error.message);
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
          <Button color="inherit" onClick={fetchRecipeSuggestion}>Suggest Recipe</Button>
        </Toolbar>
      </AppBar>
      <Stack spacing={2} width="100%" maxWidth={1200} p={2}>
        <Box display="flex" justifyContent="space-between">
          <TextField
            variant="outlined"
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Min Quantity"
            type="number"
            value={minQuantity}
            onChange={(e) => setMinQuantity(Number(e.target.value))}
            sx={{ width: '200px', ml: 2 }}
          />
          <TextField
            variant="outlined"
            label="Vendor"
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            sx={{ width: '200px', ml: 2 }}
          />
          <TextField
            variant="outlined"
            label="Description"
            value={descriptionFilter}
            onChange={(e) => setDescriptionFilter(e.target.value)}
            sx={{ width: '200px', ml: 2 }}
          />
        </Box>
        {filteredInventory.length > 0 ? (
          <Stack spacing={1}>
            {filteredInventory.map((item) => (
              <Card key={item.name}>
                <CardContent>
                  <Typography variant="h6">{item.name}</Typography>
                  <Typography>Quantity: {item.quantity}</Typography>
                  <Typography>Description: {item.description}</Typography>
                  <Typography>Vendor: {item.vendor}</Typography>
                  <Button variant="contained" color="primary" onClick={() => handleOpenEdit(item)}>
                    Edit
                  </Button>
                  <Button variant="contained" color="secondary" onClick={() => removeItem(item.name)}>
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Typography>No items found</Typography>
        )}
        <Button variant="contained" color="primary" onClick={handleOpenAdd}>
          Add Item
        </Button>
      </Stack>

      {/* Recipe Suggestion Modal */}
      <Modal
        open={openRecipeModal}
        onClose={() => setOpenRecipeModal(false)}
        aria-labelledby="recipe-suggestion-modal"
        aria-describedby="recipe-suggestion-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6">Recipe Suggestion</Typography>
          <Typography id="recipe-suggestion-description">{recipeSuggestion}</Typography>
          <Button variant="contained" color="primary" onClick={() => setOpenRecipeModal(false)}>Close</Button>
        </Box>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        open={openAddModal}
        onClose={handleCloseAdd}
        aria-labelledby="add-item-modal"
        aria-describedby="add-item-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6">Add Item</Typography>
          <TextField
            variant="outlined"
            label="Item Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={1} mt={2}>
            <Button variant="contained" color="primary" onClick={addItem}>Add</Button>
            <Button variant="contained" color="secondary" onClick={handleCloseAdd}>Cancel</Button>
          </Stack>
        </Box>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        open={openEditModal}
        onClose={handleCloseEdit}
        aria-labelledby="edit-item-modal"
        aria-describedby="edit-item-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6">Edit Item</Typography>
          <TextField
            variant="outlined"
            label="Quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            fullWidth
          />
          <Stack direction="row" spacing={1} mt={2}>
            <Button variant="contained" color="primary" onClick={updateItem}>Update</Button>
            <Button variant="contained" color="secondary" onClick={handleCloseEdit}>Cancel</Button>
          </Stack>
        </Box>
      </Modal>

      {/* Sign Up Modal */}
      <Modal
        open={openSignUpModal}
        onClose={handleCloseSignUp}
        aria-labelledby="sign-up-modal"
        aria-describedby="sign-up-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6">Sign Up</Typography>
          <TextField
            variant="outlined"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={1} mt={2}>
            <Button variant="contained" color="primary" onClick={handleSignUp}>Sign Up</Button>
            <Button variant="contained" color="secondary" onClick={handleCloseSignUp}>Cancel</Button>
          </Stack>
        </Box>
      </Modal>

      {/* Sign In Modal */}
      <Modal
        open={openSignInModal}
        onClose={handleCloseSignIn}
        aria-labelledby="sign-in-modal"
        aria-describedby="sign-in-description"
      >
        <Box sx={modalStyle}>
          <Typography variant="h6">Sign In</Typography>
          <TextField
            variant="outlined"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
          <TextField
            variant="outlined"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={1} mt={2}>
            <Button variant="contained" color="primary" onClick={handleSignIn}>Sign In</Button>
            <Button variant="contained" color="secondary" onClick={handleCloseSignIn}>Cancel</Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}


