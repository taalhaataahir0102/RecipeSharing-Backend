const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');


const app = express();
app.use(cors());
app.use(express.json());

// console.log("Here start");
// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User schema
const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
  favourite: [String],
  shoppinglist : [String],
});

const User = mongoose.model('User', userSchema);



const postSchema = new mongoose.Schema({
  category: String,
  ingredients: [String],
  recipe: String,
  image: String,
  name: String,
  comments: [String],
  commentscount: Number,
  likescount: Number,
  rating: Number,
  email: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Post = mongoose.model('Post', postSchema);

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  // console.log("here signup");
  try {
    let fav = []
    // console.log(req.body);
    const { fullName, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({ fullName, email, password: hashedPassword, favourite: fav });
    await newUser.save();

    return res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    // console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
  });


app.post('/api/signin', async (req, res) => {
  // console.log("here signin");
    try {
      const { email, password } = req.body;
  
      // Check if the user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Compare the provided password with the stored hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      // Generate JWT token
      const token = jwt.sign({ userId: user._id }, 'secret-key', {
        expiresIn: '1h',
      });
  
      return res.status(200).json({ token });
    } catch (error) {
      // console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Protected route
// app.get('/api/protected', authenticateToken, (req, res) => {
//     res.json({ message: 'Protected endpoint accessed' });
//   });
  

  app.get('/api/user', authenticateToken, (req, res) => {
    // Retrieve the user ID from the authenticated request
    const userId = req.user.userId;
    
    // Use the user ID to retrieve user information from the database
    User.findById(userId)
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
    
        // Return the user information
        return res.status(200).json({ user });
      })
      .catch(error => {
        // console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
      });
  });

  // Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    // console.log(token);
  
    if (token === null) {
      return res.sendStatus(401);
    }
  
    jwt.verify(token, 'secret-key', (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  }


// app.get('/api/posts', (req, res) => {
//     Post.find()
//       .then((posts) => {
//         res.json(posts);
//       })
//       .catch((err) => {
//         // console.error('Failed to fetch posts:', err);
//         res.status(500).json({ error: 'Failed to fetch posts' });
//       });
//   });
app.get('/api/posts', (req, res) => {
  Post.find()
    .then((posts) => {
      // Shuffle the posts array randomly
      for (let i = posts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [posts[i], posts[j]] = [posts[j], posts[i]];
      }

      res.json(posts);
    })
    .catch((err) => {
      console.error('Failed to fetch posts:', err);
      res.status(500).json({ error: 'Failed to fetch posts' });
    });
});



app.post('/api/removefromlist', authenticateToken, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const { ingredient } = req.body;

  try {
    // Find the user ID using the token
    const decodedToken = jwt.verify(token, 'secret-key');
    const userId = decodedToken.userId;

    // Find the user in the database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove the ingredient from the shopping list
    const updatedShoppingList = user.shoppinglist.filter((item) => item !== ingredient);

    // Update the user's shopping list
    user.shoppinglist = updatedShoppingList;
    await user.save();

    // Send the updated shopping list to the frontend
    res.json(updatedShoppingList);
  } catch (error) {
    console.error('Error removing ingredient from shopping list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.get('/api/shoppinglist', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const shop = user.shoppinglist;

    return res.status(200).json(shop);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


  app.get('/api/favourites', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.userId;
  
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const favoritePostIds = user.favourite;
  
      const favoritePosts = await Post.find({ _id: { $in: favoritePostIds } });
  
      return res.status(200).json(favoritePosts);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  

  app.post('/api/post', authenticateToken, async (req, res) => {
    // console.log("Yess");
    try {
      let name = ''
      let email = ''
      const userId = req.user.userId;
      await User.findById(userId)
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        name = user['fullName']
        email = user['email']
        // console.log(name)
      })

      const { category, ingredients, recipe, image } = req.body;
      const comments = []
      const commentscount = 0
      const likescount = 0
      const rating = 0
      // console.log(category, ingredients, recipe,image, name, comments, commentscount, likescount, rating, email)
  
      // Create a new post with tags
      const newPost = new Post({ category, ingredients, recipe,image, name, comments, commentscount, likescount, rating, email});
      await newPost.save();
      return res.status(201).json({ message: 'Post created successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });



  // Assuming you're using Express.js
  app.post('/api/liked', authenticateToken, async (req, res) => {
    try {
      const { postId } = req.body;
      const userId = req.user.userId;
  
      // Find the post by ID
      const post = await Post.findById(postId);
  
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      const user1 = await User.findById(userId);

        if (!user1) {
          return res.status(404).json({ message: 'User not found' });
        }

      // console.log(user1);
  
      // Get the email of the post
      // const postEmail = user1.email;
  
      // Find the user by email
      // const user = await User.findOne({ email: postEmail });
  
      // if (!user) {
      //   return res.status(404).json({ error: 'User not found' });
      // }
  
      const { favourite } = user1;
  
      // Check if the post ID is already in the user's favourite list
      const isLiked = favourite.includes(postId);
  
      if (isLiked) {
        // If already liked, remove the post ID from the favourite list and decrement likescount
        user1.favourite = favourite.filter((favId) => favId !== postId);
        post.likescount--;
      } else {
        // If not liked, add the post ID to the favourite list and increment likescount
        user1.favourite.push(postId);
        post.likescount++;
      }
  
      // Save the updated user and post
      await user1.save();
      await post.save();
  
      // Send the updated likescount in the response
      res.json({ likescount: post.likescount });
    } catch (error) {
      console.error('Error updating like:', error);
      res.status(500).json({ error: 'An error occurred while updating the like' });
    }
  });


  app.post('/api/comments', async (req, res) => {
  try {
    const { postId, commentText } = req.body;

    // Find the post by ID
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Add the comment to the comments list
    post.comments.push(commentText);
    post.commentscount++;

    // Save the updated post
    await post.save();

    res.json({ message: 'Comment added successfully' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'An error occurred while adding the comment' });
  }
});

app.post('/api/addToShoppingList', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { ingredient } = req.body;
    console.log(ingredient);
    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
     // Check if the ingredient already exists in the shopping list
    if (user.shoppinglist.includes(ingredient)) {
      return res.status(400).json({ message: 'Ingredient already exists in shopping list' });
    }

    // Add the ingredient to the shopping list
    user.shoppinglist.push(ingredient);
    await user.save();

    return res.status(200).json({ message: 'Ingredient added to shopping list' });
  } catch (error) {
    console.error('Error adding ingredient to shopping list:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


app.post('/api/updatepassword', async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]; // Extract the token from the Authorization header
    const decodedToken = jwt.verify(token, 'secret-key'); // Verify and decode the token

    const { name, email, oldPassword, newPassword } = req.body;
    console.log(name, email, oldPassword,newPassword);

    // Find the user based on the decoded token
    const user = await User.findById(decodedToken.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the old password matches the stored password
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (email !== user.email) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    user.fullName = name;
    user.email = email;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});




app.get('/api/dessert', (req, res) => {
  Post.find({category: "Dessert"}) // Filter posts with category 'Dessert'
    .then((posts) => {
      res.json(posts);
    })
    .catch((err) => {
      console.error('Failed to fetch dessert posts:', err);
      res.status(500).json({ error: 'Failed to fetch dessert posts' });
    });
});

app.get('/api/vegetarian', (req, res) => {
  Post.find({category: "Vegetarian"}) // Filter posts with category 'Dessert'
    .then((posts) => {
      res.json(posts);
    })
    .catch((err) => {
      console.error('Failed to fetch dessert posts:', err);
      res.status(500).json({ error: 'Failed to fetch dessert posts' });
    });
});

app.get('/api/meat', (req, res) => {
  Post.find({category: "Meat"}) // Filter posts with category 'Dessert'
    .then((posts) => {
      res.json(posts);
    })
    .catch((err) => {
      console.error('Failed to fetch dessert posts:', err);
      res.status(500).json({ error: 'Failed to fetch dessert posts' });
    });
});

app.get('/api/sortlikes', (req, res) => {
  Post.find()
    .sort({ likescount: -1 }) // Sort posts in descending order based on likescount
    .then((posts) => {
      res.json(posts);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Failed to fetch posts' });
    });
});

app.get('/api/sortcomments', (req, res) => {
  Post.find()
    .sort({ commentscount: -1 }) // Sort posts in descending order based on likescount
    .then((posts) => {
      res.json(posts);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Failed to fetch posts' });
    });
});

app.get('/api/sortdates', (req, res) => {
  Post.find()
    .sort({ createdAt: -1 }) // Sort posts in descending order based on createdAt date
    .then((posts) => {
      res.json(posts);
    })
    .catch((err) => {
      res.status(500).json({ error: 'Failed to fetch posts' });
    });
});




app.post('/api/email', async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const decodedToken = jwt.verify(token, 'secret-key');
  const userId = decodedToken.userId;

  try {
    const user = await User.findById(userId);
    const userEmail = user.email;
    const shoppingList = req.body.shoppingList;

    console.log(userEmail, shoppingList);

    // Code to send email to the user with the shopping list goes here

    const transporter = nodemailer.createTransport({
      // Provide your email service provider configuration here
      service: 'gmail',
      auth: {
        user: 'yourownrecipies@gmail.com',
        pass: 'rzxoffczjkbjiwcf',
      },
    });

    // Compose the email message
    const emailMessage = {
      from: 'yourownrecipies@gmail.com',
      to: userEmail,
      subject: 'Your Shopping List',
      text: shoppingList.join('\n'), // Convert the shopping list array to a string
    };

    console.log("Here")

    await transporter.sendMail(emailMessage);
    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});



// Catch all handler for all other request.
app.use('*', (req, res) => {
    res.json({ msg: 'no route handler found' }).end()
  })

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});