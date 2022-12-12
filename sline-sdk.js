/**
 * The browser console
 *
 * @property console
 * @private
 * @type object
 */
window.console = window.console || {};
window.console.log = this.console.log || function () {};

/**
 * Expose our sdk
 */
(function (root) {
  root.Sline = root.Sline || {};
  root.Sline.VERSION = "1.0.6";
})(this);

/**
 * main sdk
 */
(function (root) {
  root.Sline = root.Sline || {};

  /**
   * Contains all Sline API classes and functions.
   * @name Sline
   * @namespace
   *
   * Contains all Sline API classes and functions.
   */
  var Sline = root.Sline;

  /**
   * Call this method first to set your authentication key.
   * @param {String} retailerSlug Retailer Token
   * @param {Boolean} prod Init in Production or Staging
   */
  Sline.Initialize = function (retailerSlug, prod) {
    Sline._initialize(retailerSlug, prod);
  };

  /**
   * This method is for Sline's own private use.
   * @param {String} retailerSlug retailer identifier
   */
  Sline._initialize = function (retailerSlug, prod) {
    Sline.retailerSlug = retailerSlug;
    if (prod) {
      Sline.apiURL = "https://api.sline.io/checkout/cart";
      Sline.baseCheckoutURL = "https://checkout.sline.io/checkout/";
    } else {
      Sline.apiURL = "https://api.staging.sline.io/checkout/cart";
      Sline.baseCheckoutURL = "https://checkout.staging.sline.io/checkout/";
    }
    Sline.cart = [];
    Sline.checkoutURL = "";
    Sline.prices = [];
    Sline.durations = [];
    Sline.checkoutButton = {id: null, text: ''};
  };

  Sline.SetCheckoutButton = function(id, text) {
    Sline.checkoutButton = {id, text};
  }

  /**
   * Add Product to Cart
   * @param {string} sku of the product
   * @param {int} qty of the product
   */
  Sline.AddCart = function (sku, qty) {
    var index = Sline.cart.findIndex(x => x.sku === sku);
    if (index !== -1) {
      Sline.cart[index].quantity += qty;
    } else {
      Sline.cart.push({ sku: sku, quantity: qty });
    }
    Sline._UpdateCheckoutButton();
  };

  /**
   * Update Product in Cart
   * @param {string} sku of the product
   * @param {int} qty of the product
   */
  Sline.UpdateCart = function (sku, qty) {
    var index = Sline.cart.findIndex(x => x.sku === sku);
    if (index !== -1) {
      Sline.cart[index].quantity = qty;
    } else {
      Sline.cart.push({ sku: sku, quantity: qty });
    }
    Sline._UpdateCheckoutButton();
  }

  /**
   * Reset Cart
   */
  Sline.ResetCart = function () {
    Sline.cart = [];
  };

  Sline._GenerateCheckoutURL = async function(cart) {
    var url = Sline.apiURL + "/import";
    var payload = {};
    payload["cart"] = cart;
    payload["retailerSlug"] = Sline.retailerSlug;

    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("content-type", "application/json");
    var raw = JSON.stringify(payload);
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      return console.warn(error);
    }
  };

  /**
   * Insert checkout URL from cart in link designated by id
   * If prefix is set, will set the text of the link with prefix + minMonthlyPrice + € /mois
   * @param {string} id of href which will be updated with link to checkout
   * @param {string} prefix of href text content that will inserted (optionnal)
   */
  Sline.RequestCheckoutURL = async function (id, prefix) {
    if (Sline.cart.length > 0) {
      var cart = Sline.cart;
      var resUrl = await Sline._GenerateCheckoutURL(cart);
      Sline.checkoutURL = Sline.baseCheckoutURL + resUrl.id;
    }
  };

  Sline._RequestPrices = async function (cart) {
    var url = Sline.apiURL + "/pricing";
    var payload = {};
    payload["cart"] = cart;
    payload["retailerSlug"] = Sline.retailerSlug;

    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("content-type", "application/json");
    var raw = JSON.stringify(payload);
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();
      return responseData;
    } catch (error) {
      return console.warn(error);
    }
  };

  Sline.GetDurationsAndPrices = async function (sku) {
    var url = Sline.apiURL + "/pricing";
    var payload = {};
    payload["cart"] = [{
      sku,
      quantity: 1
    }];
    payload["retailerSlug"] = Sline.retailerSlug;

    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("content-type", "application/json");
    var raw = JSON.stringify(payload);
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json()
      .then(res => {
        Sline.durations = res.map(duration => duration.numberOfInstalments).sort((a, b) => a - b);
        Sline.prices[sku] = {};
        res.forEach(duration => {
          Sline.prices[sku][`${duration.numberOfInstalments}`] = {
            firstInstalmentPrice: duration.firstInstalmentPrice,
            otherInstalmentPrice: duration.otherInstalmentPrice
          };
        });
        document.body.dispatchEvent(new Event('SlinePricesReady', {
          bubbles: true
        }));
      });
      return responseData;
    } catch (error) {
      return console.warn(error);
    }
  };

  Sline._UpdateCheckoutButton = async function () {
    const checkoutButton = document.getElementById(Sline.checkoutButton.id);
    const sku = checkoutButton.getAttribute('data-name');

    if (sku && Sline.durations.length && Sline.prices[sku]) {

      const minDuration = Sline.durations[0];
      console.log(minDuration, Sline.prices[sku]);
      const minPrice = Sline.prices[sku][minDuration].otherInstalmentPrice;
      let currencySymbol = '';
      switch (minPrice.price.currency) {
        case 'USD':
          currencySymbol = '$';
          break;
          
        default:
          currencySymbol = '€';
          break;
      }
      checkoutButton.textContent = `${Sline.checkoutButton.text}${minPrice.amount/100}${currencySymbol}/mois`
    }
  }

})(this);
