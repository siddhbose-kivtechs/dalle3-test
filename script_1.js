document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("imageForm");
  const output = document.getElementById("output");
  const loader = document.getElementById("loader");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const prompt = document.getElementById("prompt").value;
    const size = document.getElementById("size").value;
    const n = parseInt(document.getElementById("n").value);
    const payload = { prompt, size, n };

    loader.classList.remove("hidden"); // Show loader
    output.innerHTML = ""; // Clear previous output

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
        renderImages(result);
      } else {
        const text = await res.text();
        output.innerHTML = `<pre>Server error: ${text}</pre>`;
      }
    } catch (err) {
      output.innerHTML = `<pre>Request failed: ${err.message}</pre>`;
    } finally {
      loader.classList.add("hidden"); // Hide loader
    }
  });

  function renderImages(data) {
    output.innerHTML = ""; // Clear output

    const imagesContainer = document.createElement("div");
    imagesContainer.className = "images-container";

    const imageItems = data.data || data.images || [];

    if (Array.isArray(imageItems) && imageItems.length > 0) {
      imageItems.forEach((item, i) => {
        const imageContainer = document.createElement("div");
        imageContainer.className = "image-item";

        const imageUrl = typeof item === 'object' ? item.url : item;

        if (imageUrl) {
          const img = document.createElement("img");
          img.src = imageUrl;
          img.alt = `Generated Image ${i + 1}`;
          img.className = "generated-image";
          imageContainer.appendChild(img);

          const urlDisplay = document.createElement("div");
          urlDisplay.className = "image-url";
          urlDisplay.innerHTML = `<p>Image URL:</p><input type="text" value="${imageUrl}" readonly onClick="this.select();" />`;
          imageContainer.appendChild(urlDisplay);

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
          urlDisplay.appendChild(copyButton);

          imagesContainer.appendChild(imageContainer);
        }
      });

      output.appendChild(imagesContainer);

      // Inject CSS if not already present
      if (!document.getElementById("image-display-styles")) {
        const style = document.createElement("style");
        style.id = "image-display-styles";
        style.textContent = `
          .images-container {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-top: 20px;
          }
          .image-item {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
          }
          .generated-image {
            max-width: 100%;
            margin-bottom: 10px;
          }
          .image-url {
            margin-top: 10px;
          }
          .image-url input {
            width: 100%;
            padding: 5px;
            margin-bottom: 5px;
            font-size: 14px;
          }
          .copy-url-btn {
            padding: 5px 10px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
          }
          .copy-url-btn:hover {
            background-color: #45a049;
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      output.innerHTML = "<pre>No images found in response</pre>";
    }
  }
});

