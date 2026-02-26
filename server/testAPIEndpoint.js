import axios from 'axios';

// Test the actual API endpoint
const testUpdateProfile = async () => {
  const apiUrl = 'http://localhost:5000/api/admins/me';
  
  const testPayloads = [
    {
      name: "Full name only",
      data: {
        full_name: "Updated Admin Name"
      }
    },
    {
      name: "With empty strings",
      data: {
        full_name: "Admin User",
        job_title: "",
        bio: "",
        linkedin_url: "",
        github_url: "",
        portfolio_url: ""
      }
    },
    {
      name: "With valid URLs",
      data: {
        full_name: "Admin User",
        job_title: "System Administrator",
        bio: "Managing the platform",
        linkedin_url: "https://linkedin.com/in/admin",
        github_url: "https://github.com/admin",
        portfolio_url: "https://admin.portfolio.com"
      }
    }
  ];

  // Use a dummy token for testing
  const token = "dummy_token_for_testing";
  
  for (const test of testPayloads) {
    console.log(`\nTest: ${test.name}`);
    console.log('Payload:', JSON.stringify(test.data, null, 2));
    
    try {
      const response = await axios.put(apiUrl, test.data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on any status
      });
      
      console.log('Status:', response.status);
      if (response.status !== 200) {
        console.log('Error Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('✅ Success');
      }
    } catch (error) {
      console.log('Request Error:', error.message);
    }
  }
};

testUpdateProfile().catch(err => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
