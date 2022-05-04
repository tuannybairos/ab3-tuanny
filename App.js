import React, { useRef, useEffect, useState, useReducer } from "react";
import api from "./services/api";
import axios from "axios"

const formReducer = (state, event) => {
  return {
    ...state,
    [event.target.name]: event.target.value
  }
}

// Setting parameters = null.
function App() {
  const [submitting, setSubmitting] = useState(false);

  const [user, setUser] = useState(null);
  const [cabin, setCabin] = useState(null);

  const videoRef = useRef(null);
  const photoRef = useRef(null);

  const [hasPhoto, setHasPhoto] = useState(false);

  const [hasForm, setHasForm] = useState(false);
  const [formData, setFormData] = useReducer(formReducer, {});

  const [hasProducts, setHasProducts] = useState(false);

  const [productName, setProductName] = useState('teste');
  const [product, setProduct] = useState({ product_id: "", name: "" });
  const [imageUrlProduct, setImageUrlProduct] = useState(null);

  const [hasToCallRecommendations, sethasToCallRecommendations] = useState(true);


  // API: /createsession: Recebe userid
  const callApi = () => {

    let config = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
      }
    }
    console.log('Chamando API createsession')

    api
      .options("/createsession", config)
      .then(response => {
        console.log('response', response)
        let responseApi = response.data
        console.log('responseApi', responseApi)
        setUser(response.data)
      })
      .catch((err) => {
        console.error("ops! ocorreu um erro" + err);
      });

  }

  // API: /upload: Faz upload da imagem para o S3
  const sendPhotoToS3 = (img) => {
    let imagetofile = dataURLtoFile(img, user)
    axios
      ({
        method: 'post',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
          'Content-Type': 'image/jpeg'
        },
        params: { userid: user },
        url: 'https://kb4pn20gg2.execute-api.us-east-1.amazonaws.com/dev/upload',
        data: imagetofile,
      }).then(function (response) {
        console.log(response);
      });
  }

  // API: /items: Envia os produtos.
  const callApiToSendItens = (formData) => {

    let data = {
      "user_id": user,
      "product": [formData]
    }

    console.log('data to api de items', data)

    let config = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT,POST,OPTIONS',
        'Content-Type': 'application/json'
      },
      data: data
    }

    console.log('Chamando API callApiToSendItens')

    api
      .put("/items", config)
      .then(response => {
        console.log('response', response)
        let responseApi = response.data
        console.log('responseApi', responseApi)
        setCabin(responseApi.body)
        console.log(responseApi.body)
        var messageAlert = ''
        if (responseApi.body == null) {
          messageAlert = 'Aguarde um momento. Todos os provadores encontram-se ocupados.'
        } else {
          messageAlert = 'Favor dirigir-se ao provador ' + responseApi.body;
        }
        alert(messageAlert)
        callApiToGetRecommendations();
      })
      .catch((err) => {
        console.error("ops! ocorreu um erro" + err);
      });

  }


  // API: /recommendations: Solicita a recomendação para userid.
  const callApiToGetRecommendations = () => {

    if (hasToCallRecommendations) {
      sethasToCallRecommendations(false)
      axios
      ({
        method: 'put',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS'
        },
        params: { userid: user },
        url: 'https://kb4pn20gg2.execute-api.us-east-1.amazonaws.com/dev/recommendations'
      }).then(function (response) {
        console.log(response);
        let responseApi = response.data

        setHasProducts(true)
        setHasForm(false)
        setProduct(responseApi.Product, responseApi.Name)
        setProductName(responseApi.Name)
        setImageUrlProduct(responseApi.Image)
      });


    }



  }

  // API: /realtime: Envia userid, itemid, event_type, cabin.

  const callApiToPutEvents = (like) => {
    console.log('product___', product)

    let paramsUrl = "userid=" + user + "&item_id="+ product + "&event_type=" + (like? "like" : 'dislike') + "&cabin=" + cabin

    let allUrl = 'https://kb4pn20gg2.execute-api.us-east-1.amazonaws.com/dev/realtime?' + paramsUrl

    console.log('allUrl________', allUrl)


    axios
      ({
        method: 'put',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
          'Content-Type': 'application/json'
        },
        data: '',
        url: allUrl
      }).then(function (response) {
        console.log('response', response)
        console.log('helooooo_____________')
        sethasToCallRecommendations(true)
        callApiToGetRecommendations()
      });

  }


  const getVideo = () => {

    if (!hasPhoto) {
      navigator.mediaDevices.getUserMedia(
        {
          video: { width: 1920, height: 1080 }
        })
        .then(stream => {
          let video = videoRef.current;
          video.srcObject = stream;
          video.play();
        })
        .catch(err => {
          console.error(err);
        })

      return (
        <div>
          <video ref={videoRef}></video>
          <button onClick={takePhoto}>Sorria!</button>
        </div>

      )
    }

  }

  const stopStream = (stream) => {
    console.log('stop  webcam called');
    stream.getVideoTracks().forEach(function (track) {
      track.stop();
    });
  }

  const takePhoto = () => {
    const width = 414;
    const height = width / (16 / 9);

    let video = videoRef.current;
    let photo = photoRef.current;

    photo.width = width;
    photo.height = height;

    let ctx = photo.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);
    setHasPhoto(true);

    var img = photo.toDataURL("image/jpeg");

    sendPhotoToS3(img);

    stopStream();
  }

  const dataURLtoFile = (dataUrl, fileName) => {
    var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], fileName, { type: mime });
  }


  const closePhoto = () => {
    let photo = photoRef.current;
    let ctx = photo.getContext('2d');
    setHasPhoto(false);

    ctx.clearRect(0, 0, photo.width, photo.height);
    setHasForm(true);


  }

  useEffect(() => {

  }, [videoRef], [user], [cabin], [hasForm])


  const handleSubmit = event => {
    setSubmitting(true);
    event.preventDefault();
    console.log('formData', formData)
    callApiToSendItens(formData);
  }

  const showCamera = () => {

    return (
      <div className={'result ' + (hasPhoto ? 'hasPhoto' : '')}>
        <div className={'camera ' + (user ? <video ref={videoRef}></video> : '')} />
        <canvas ref={photoRef}></canvas>
        <button onClick={closePhoto}>Quais peças você gostou?</button>

      </div>
    )

  }

  const showProducts = () => {

    return (
      <div className="wrapper2">
        <br></br>
        <h1>Recomendamos essa peça para você:</h1>
        <br></br>
        <p>{productName}</p>
        <br></br>
        <img src={imageUrlProduct} width={350} height={400} />
        <button onClick={callApiToPutEventsLike}>Eu quero!</button>
        <buttonmore onClick={callApiToPutEventsDislike}>Mais opções..</buttonmore>

      </div>
    );

  }

  const callApiToPutEventsLike = () => {
    callApiToPutEvents(true)
 }

 const callApiToPutEventsDislike = () => {
   callApiToPutEvents(false)
 }

  const createForm = () => {

    return (
      <div className="wrapper">
        <h1>Insira os códigos de barras aqui:</h1>
        {submitting &&
          <div>Enviando formulário..</div>
        }
        <form onSubmit={handleSubmit}>
          <fieldset>
            <label>
              Código de barra da primeira peça:
              <input
                name="items01"
                type="text"
                onChange={setFormData} />
            </label>
          </fieldset>
          <fieldset>
            <label>
              Código de barra da segunda peça:
              <input
                name="items02"
                type="text"
                onChange={setFormData}
              />
            </label>
          </fieldset>
          <fieldset>
            <label>
              Código de barra da terceira peça:
              <input
                name="items03"
                type="text"
                onChange={setFormData} />
            </label>
          </fieldset>
          <button type="submit">Enviar</button>
        </form>
      </div>
    );

  }


  return (
    <div className="App">

      {!user ? <button className="buttonStart" onClick={callApi}>Clique aqui</button> : ''}

      {user && !hasForm && !hasProducts ? getVideo() : ''}

      {hasForm ? createForm() : hasProducts ? showProducts() : showCamera()}
    </div>
  );
}

export default App;
