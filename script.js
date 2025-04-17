
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("imageForm");
  const output = document.getElementById("output");
  const loader = document.getElementById("loader");
  const status = document.getElementById("status");
  
  // Get the original input element
  let promptInput = document.getElementById("prompt");
  
  // Convert input to auto-expandable field and store the NEW reference
  promptInput = convertToAutoExpandingInput(promptInput);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Fix: Properly trim and check prompt value from the current textarea
    const prompt = promptInput.value.trim();
    if (!prompt || prompt.length === 0) {
      showStatus("Please enter a prompt", "error");
      promptInput.classList.add("error");
      return;
    }

    // Clear any previous error states
    clearErrorState(promptInput);

    const size = document.getElementById("size").value;
    const n = parseInt(document.getElementById("n").value);
    const payload = { prompt, size, n };

    loader.classList.remove("hidden"); // Show loader
    output.innerHTML = ""; // Clear previous output
    showStatus("Generating image...", "loading");

    const bsonData = BSON.serialize(payload);
    try {
      const res = await fetch("https://dalle3-backend-1.onrender.com/api/image/dalle3/bson", {
        method: "POST",
        headers: {
          "Content-Type": "application/bson",
        },
        body: bsonData,
      });

      console.log("Server Response Status: ", res.status);
      console.log("Response Headers: ", res.headers);

      if (res.ok && res.headers.get("Content-Type") === "application/bson") {
        const buffer = await res.arrayBuffer();
        const result = BSON.deserialize(new Uint8Array(buffer));
        console.log("Server Response Data: ", result);

        if (result.error) {
          handleErrorResponse(result.error);
        } else {
          renderImages(result);
          showStatus("Image generated successfully!", "success");
        }
      } else {
        try {
          const text = await res.text();
          // Try to parse as JSON first
          try {
            const errorData = JSON.parse(text);
            handleErrorResponse(errorData.error || { message: text });
          } catch (parseErr) {
            // If not JSON, just display the text
            output.innerHTML = `<pre>Server error: ${text}</pre>`;
            showStatus("Server error occurred", "error");
          }
        } catch (textErr) {
          output.innerHTML = `<pre>Server error: Unable to read response</pre>`;
          showStatus("Server error occurred", "error");
        }
      }
    } catch (err) {
      output.innerHTML = `<pre>Request failed: ${err.message}</pre>`;
      showStatus("Request failed", "error");
    } finally {
      loader.classList.add("hidden"); // Hide loader
    }
  });

  // Add input event listener to clear error state when user types
  promptInput.addEventListener("input", function() {
    if (this.value.trim().length > 0) {
      clearErrorState(this);
    }
  });

  function clearErrorState(element) {
    element.classList.remove("error");
    const errorElement = document.querySelector(".prompt-error");
    if (errorElement) {
      errorElement.remove();
    }
  }

  function handleErrorResponse(error) {
    let errorMessage = "An error occurred";
    
    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error.message) {
      errorMessage = error.message;

      // Handle specific error cases
      if (error.code === "invalidPayload" && error.message.includes("n=1")) {
        errorMessage = "Multiple images are not available with your current plan. Please select quantity = 1.";
      }
    }

    output.innerHTML = `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${errorMessage}</div>
      </div>
    `;
    showStatus(errorMessage, "error");
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = "status";
    if (type) status.classList.add(type);
    
    // Auto-hide success messages after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        status.classList.remove("success");
        status.textContent = "";
      }, 5000);
    }
  }

  function convertToAutoExpandingInput(element) {
    // Create a div to contain our elements
    const container = document.createElement("div");
    container.className = "auto-expanding-input-container";
    
    // Create the textarea
    const textarea = document.createElement("textarea");
    textarea.id = element.id;
    textarea.name = element.name;
    textarea.placeholder = element.placeholder || "Enter your prompt";
    textarea.required = element.required;
    textarea.value = element.value;
    textarea.className = "auto-expanding-input";
    textarea.rows = 3; // Default rows
    
    // Replace the input with our container and add the textarea
    element.parentNode.replaceChild(container, element);
    container.appendChild(textarea);
    
    // Add event listener to auto-expand
    textarea.addEventListener("input", function() {
      // Reset height to auto and then set to scrollHeight
      this.style.height = "auto";
      this.style.height = (this.scrollHeight) + "px";
      
      // Clear any error messages when user starts typing
      if (this.value.trim().length > 0 && this.classList.contains("error")) {
        clearErrorState(this);
      }
    });
    
    // Initial adjustment
    setTimeout(() => {
      textarea.style.height = "auto";
      textarea.style.height = (textarea.scrollHeight) + "px";
    }, 0);
    
    // Return the new textarea element
    return textarea;
  }

  function renderImages(data) {
    output.innerHTML = ""; // Clear output

    const imagesContainer = document.createElement("div");
    imagesContainer.className = "images-container";

    const imageItems = data.data || data.images || [];

    if (Array.isArray(imageItems) && imageItems.length > 0) {
      // First, show the prompt that was used
      const promptDisplay = document.createElement("div");
      promptDisplay.className = "prompt-text";
      // Use the updated promptInput reference
      promptDisplay.innerHTML = `<p>Prompt Used:</p><p>${promptInput.value}</p>`;
      output.appendChild(promptDisplay);

      imageItems.forEach((item, i) => {
        const imageContainer = document.createElement("div");
        imageContainer.className = "image-item";

        const imageUrl = typeof item === 'object' ? item.url : item;

        if (imageUrl) {
          const img = document.createElement("img");
          img.src = imageUrl;
          img.alt = `Generated Image ${i + 1}`;
          img.className = "generated-image";
          
          // Add loading animation
          img.style.opacity = "0";
          img.onload = function() {
            this.style.transition = "opacity 0.5s ease";
            this.style.opacity = "1";
          };
          
          imageContainer.appendChild(img);

          const urlDisplay = document.createElement("div");
          urlDisplay.className = "image-url";
          urlDisplay.innerHTML = `<p>Image URL:</p><input type="text" value="${imageUrl}" readonly onClick="this.select();" />`;
          imageContainer.appendChild(urlDisplay);

          const actionButtons = document.createElement("div");
          actionButtons.className = "action-buttons";

          const copyButton = document.createElement("button");
          copyButton.textContent = "Copy URL";
          copyButton.className = "copy-url-btn";
          copyButton.onclick = function () {
            navigator.clipboard.writeText(imageUrl)
              .then(() => {
                this.textContent = "Copied!";
                setTimeout(() => {
                  this.textContent = "Copy URL";
                }, 2000);
              })
              .catch(err => {
                console.error('Failed to copy: ', err);
              });
          };
          actionButtons.appendChild(copyButton);

          // Add Download Button
          const downloadButton = document.createElement("a");
          downloadButton.href = imageUrl;
          downloadButton.download = `dalle3_image_${i + 1}.png`; // Suggest a filename
          downloadButton.textContent = "Download";
          downloadButton.className = "download-btn";
          actionButtons.appendChild(downloadButton);
          
          imageContainer.appendChild(actionButtons);
          imagesContainer.appendChild(imageContainer);
        }
      });

      output.appendChild(imagesContainer);
    } else {
      output.innerHTML = "<div class='error-container'><p>No images found in response</p></div>";
    }
  }
});
