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
 * expose our sdk
 */
(function (root) {
  root.Sline = root.Sline || {};
  root.Sline.VERSION = "js1.0.0";
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

  // If jQuery has been included, grab a reference to it.
  if (typeof root.$ !== "undefined") {
    Sline.$ = root.$;
  }

  /**
   * Call this method first to set your authentication key.
   * @param {String} retailerSlug Retailer Token
   * @param {Boolean} prod Init in Production or Staging
   */
  Sline.Initialize = function (retailerSlug, prod) {
    Sline._initialize(retailerSlug, prod);
  };

  /**
   * Add Product to Cart
   * @param {string} sku of th product
   * @param {int} qty of the product
   */
  Sline.AddCart = function (sku, qty) {
    Sline.cart.push({ sku: sku, quantity: qty });
  };

  /**
   * Reset Cart
   */
  Sline.ResetCart = function () {
    Sline.cart = [];
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
  };

  function _GenerateCheckoutURL() {
    var url = Sline.apiURL + "/import";
    var payload = {};
    payload["cart"] = Sline.cart;
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
    return fetch(url, requestOptions)
      .then((response) => response.json())
      .then((responseData) => {
        return responseData;
      })
      .catch((error) => console.warn(error));
  }

  /**
   * Get checkout URL from cart
   */
  Sline.RequestCheckoutURL = async () => {
    res = await _GenerateCheckoutURL();
    Sline.checkoutURL = Sline.baseCheckoutURL + res.id;
    var findlink = document.getElementById("rent");
    findlink.href = Sline.checkoutURL;
  };
})(this);
