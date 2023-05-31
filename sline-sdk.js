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
  root.Sline.VERSION = "3.0.0";
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

  var svgLoader = `<svg version="1.1" id="L4" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" style="height: 25px; width: 66px; margin-left: -20px; margin-top: -3px;"
  viewBox="0 0 100 100" enable-background="new 0 0 0 0" xml:space="preserve">
  <circle fill="#fff" stroke="none" cx="6" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite"
      begin="0.1"/>    
  </circle>
  <circle fill="#fff" stroke="none" cx="46" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite" 
      begin="0.2"/>       
  </circle>
  <circle fill="#fff" stroke="none" cx="86" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite" 
      begin="0.3"/>     
  </circle>
  <circle fill="#fff" stroke="none" cx="126" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite" 
      begin="0.4"/>     
  </circle>
  <circle fill="#fff" stroke="none" cx="166" cy="50" r="10">
    <animate
      attributeName="opacity"
      dur="1s"
      values="0;1;0"
      repeatCount="indefinite" 
      begin="0.5"/>     
  </circle>
</svg>`;

  /**
   * Call this method first to set your authentication key.
   * @param {Config} config Configuration options
   */
  Sline.Initialize = function (config) {
    if (typeof config !== "object") {
      throw "Invalid initialization: configuration options should be an object";
    }

    Sline._Initialize(config);
    Sline.InitializeCheckoutButton(config);
    Sline._InitializeDurationSelector(config);
  };

  /**
   * This method is for Sline's own private use.
   * @param {Object} config Configuration options
   */
  Sline._Initialize = function (config) {
    if (!config.retailer) {
      throw "Invalid configuration: missing retailer information";
    }
    Sline.ApiToken = config.apiToken
    Sline.retailerSlug = config.retailer;
    if (typeof config?.production === "boolean" && config.production) {
      Sline.apiURL = "https://api.stg.sline.io/v1";
      Sline.baseCheckoutURL = "https://checkout.stg.sline.io";
    } else {
      Sline.apiURL = "https://api.stg.sline.io/v1";
      Sline.baseCheckoutURL = "https://checkout.stg.sline.io";
    }
    Sline.customer = {};
    Sline.shippingAddress = {};
    Sline.billingAddress = {};
    Sline.options = {};
    Sline.checkoutURL = "";
    Sline.prices = {};
    Sline.taxRate = config.taxRate ?? 20.0
    Sline.durations = [];
    Sline.lineItems = [];
  };

  /**
   * Configures the checkout button and its events
   * @param {Object} config Configuration options
   */
  Sline.InitializeCheckoutButton = function (config) {
    if (
      !config.checkoutButton ||
      (!config.checkoutButton.id && config.checkoutButton?.classPath.toString().trim().length === 0) ||
      (!config.checkoutButton.classPath && config.checkoutButton?.id.toString().trim().length === 0)
    ) {
      throw "Invalid configuration: missing checkout button id or classPath";
    }

    const checkoutButton = config.checkoutButton.id ? document.getElementById(config.checkoutButton.id) : document.querySelectorAll(config.checkoutButton.classPath);
    if (!checkoutButton) {
      throw "Invalid configuration: checkout button does not exist";
    }

    Sline.checkoutButton = {
      id: config.checkoutButton.id,
      classPath: config.checkoutButton.classPath,
      prefix: config?.checkoutButton?.prefix?.toString()?.trim() ?? "",
      suffix: config?.checkoutButton?.suffix?.toString()?.trim() ?? "",
      events: {
        customOnClickEvent: config?.checkoutButton?.events?.customOnClickEvent
          ? !!config?.checkoutButton?.events?.customOnClickEvent
          : false,
      },
    };

    if (!Sline.checkoutButton.events.customOnClickEvent && config.checkoutButton.id) {
      checkoutButton.removeEventListener("click", Sline.OnCheckoutButtonClick);
      checkoutButton.addEventListener("click", Sline.OnCheckoutButtonClick);
    } else if (!Sline.checkoutButton.events.customOnClickEvent && config.checkoutButton.classPath) {
      const buttons = document.querySelectorAll(config.checkoutButton.classPath);
      if (buttons.length) {
        buttons.forEach(button => {
          button.removeEventListener("click", Sline.OnCheckoutButtonClick);
          button.addEventListener("click", Sline.OnCheckoutButtonClick);
        })
      }
    }
  };

  /**
   * Catches the event on the checkout button click
   * @param {Event} e Event generated on click
   */
  Sline.OnCheckoutButtonClick = async function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (Sline.lineItems.length === 0) return false

    e.target.setAttribute("disabled", "disabled");
    e.target.innerHTML = `<div style="height: 25px; text-align: center;">${svgLoader}</div>`;
    await Sline._GenerateCheckoutURL(Sline.lineItems)
    .then(response => {
      if (!Sline.checkoutButton.events.customOnClickEvent) {
        location.href = Sline.checkoutURL
      }
      return response;
    })
  };

  /**
   * Initializes the duration selector and its events
   * @param {Object} config Configuration options
   */
  Sline._InitializeDurationSelector = function (config) {
    Sline.durationSelector = {
      id: config.durationSelector?.id ?? null,
      value: null,
    };

    const durationSelector = document.getElementById(Sline.durationSelector.id);
    if (durationSelector) {
      if (durationSelector.type === "select-one") {
        durationSelector.removeEventListener(
          "change",
          Sline._OnDurationSelectorClick
        );
        durationSelector.addEventListener(
          "change",
          Sline._OnDurationSelectorClick
        );
      } else {
        durationSelector.removeEventListener(
          "click",
          Sline._OnDurationSelectorClick
        );
        durationSelector.addEventListener(
          "click",
          Sline._OnDurationSelectorClick
        );
      }
    }

    if (!durationSelector && Sline.durationSelector.id) {
      throw "Invalid configuration: duration selector does not exist";
    }
  };

  /**
   * Catches the event when the duration changes
   * @param {Event} e Event generated on click
   */
  Sline._OnDurationSelectorClick = async function (e) {
    if (e.target.type === "radio" || e.target.type === "select-one") {
      Sline.durationSelector.value = e.target.value;

      Sline._UpdateCheckoutButton();
    }
  };

  /**
   * Add LineItem to LineItems
   * @param {LineItem} lineItem
   * @param {int} qty
   */
  Sline.AddLineItem = function (lineItem, qty) {
    Sline.UpdateLineItem(lineItem, qty);
  };

  /**
   * Add Options 
   * @param {Options} options of session
   */
  Sline.setOptions = function (options) {
    Sline.options = options;
  };

  /**
   * Update LineItem in LineItems
   * @param {LineItem} lineItem 
   * @param {int} qty of the product
   */
  Sline.UpdateLineItem = async function (lineItem, qty) {
    // Check if already inside LineItems
    var index = Sline.lineItems.findIndex((x) => x.reference === lineItem.reference);
    // if already inside update quantity 
    if (index !== -1) {
      Sline.lineItems[index].quantity = Number(qty);
    } else {
    // if not push inside LineItems 
      Sline.lineItems.push({
        ...lineItem,
        quantity: Number(qty),
      });
    }

    if (!Sline.prices[lineItem.reference]) {
      await Sline._GetDurationsAndPrices();
    }

    Sline._UpdateCheckoutButton();
  };

  /**
   * Remove lineItems already set
   */
  Sline.ResetLineItems = function () {
    Sline.lineItems = [];
  };

  /**
   * Add customer
   * @param {Customer} customer
   * @returns
   */
  Sline.AddCustomer= function (customer) {
    Sline.customer = customer;
  };

  /**
   * Remove customer already set
   */
  Sline.ResetCustomer= function () {
    Sline.customer = {};
  };

  /**
   * Add shipping address
   * @param {Address} address
   * @returns
   */
  Sline.AddShippingAddress= function (address) {
    Sline.shippingAddress = address;
  };

  /**
   * Add billing address
   * @param {Address} address
   * @returns
   */
  Sline.AddBillingAddress= function (address) {
    Sline.billingAddress = address;
  };

  /**
   * Generates the checkout URL with lineItems
   * @param {Array} lineItems
   * @returns
   */
  Sline._GenerateCheckoutURL = async function (lineItems) {
    var url = Sline.apiURL + "/sessions";
    var payload = {};

    if (lineItems.length === 0) return false

    // Prepare payload
    payload["line_items_attributes"] = lineItems;
    payload["billing_address_attributes"] = Sline.billingAddress;
    payload["shipping_address_attributes"] = Sline.shippingAddress;
    payload["session_customer_attributes"] = Sline.customer;
    payload["selected_duration"] = Number(Sline.durationSelector.value);
    Object.keys(Sline.options).map(k => payload[k] = Sline.options[k]);

    // Set Header
    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("content-type", "application/json");
    myHeaders.append("Authorization", `Bearer ${Sline.ApiToken}`);

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

      // Set checkout redirection url baseUrl/:sessionId?retailerApiKey=ApiToken
      Sline.checkoutURL = Sline.baseCheckoutURL + '/' + responseData.id + `?retailerApiKey=${Sline.ApiToken}`;
      
      return responseData;
    } catch (error) {
      return console.warn(error);
    }
  };

  /**
   * Gets the duration options for current lineItems
   */
  Sline._GetDurationsAndPrices = debounce(async function () {
    var url = Sline.apiURL + "/plans";
    var payload = {};
    payload["line_items"] = Sline.lineItems;

    var myHeaders = new Headers();
    myHeaders.append("accept", "application/json");
    myHeaders.append("content-type", "application/json");
    myHeaders.append("Authorization", `Bearer ${Sline.ApiToken}`);
    var raw = JSON.stringify(payload);
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json().then((res) => {
        Sline.lineItems.forEach((lineItem) => {
          Sline.durations = res.line_items
            .map((lineItem) => lineItem.plans.map(plan => plan.duration))[0]
            .sort((a, b) => a - b);
          if (!Sline.durationSelector.value) {
            Sline.durationSelector.value =
            Sline.durations[Sline.durations.length - 1];
          }
        });

        res.line_items.forEach((lineItem) => {
          Sline.prices[lineItem.reference]= {}
          lineItem.plans.forEach((plan) => {
            Sline.prices[lineItem.reference][plan.duration] = {
              firstInstalmentPrice: plan.first_instalment,
              firstInstalmentPriceWithTax: plan.first_instalment * (1 + Sline.taxRate / 100),
              otherInstalmentPrice: plan.other_instalment,
              otherInstalmentPriceWithTax: plan.other_instalment * (1 + Sline.taxRate / 100),
              taxRate: Sline.taxRate
            };
          });
        });

        // Event that can be caught by the retailer's dev team
        document.body.dispatchEvent(
          new Event("SlinePricesReady", {
            bubbles: true,
          })
        );

        Sline._UpdateCheckoutButton();
      });
      return responseData;
    } catch (error) {
      return console.warn(error);
    }
  }, 200);

  /**
   * Updates the checkout button text
   */
  Sline._UpdateCheckoutButton = async function () {
    //somme des prices
    const buttons = Sline.checkoutButton.id ? [document.getElementById(Sline.checkoutButton.id)] : document.querySelectorAll(Sline.checkoutButton.classPath);
    
    buttons.forEach(checkoutButton => {
      checkoutButton.setAttribute("disabled", "disabled");
  
      let minPrice = 0;
      if (Sline.checkoutButton.id) {
        Sline.lineItems.forEach((item, k) => {
          minPrice += Sline.prices[item.reference]
            ? Sline.prices[item.reference][Sline.durationSelector.value].otherInstalmentPriceWithTax
            : 0;
        });
      } else {
        const reference = checkoutButton.getAttribute('data-reference')
        const index = Sline.lineItems.map(item => item.reference).indexOf(reference)
        if (Sline.prices[reference]) {
          minPrice = Sline.prices[reference][Sline.durationSelector.value].otherInstalmentPriceWithTax
        }
      }
  
      if (
        Sline.checkoutButton.prefix.length ||
        Sline.checkoutButton.suffix.length
      ) {
        checkoutButton.textContent = `${Sline.checkoutButton.prefix} ${
          minPrice / 100
        }${Sline._GetCurrencySymbol()} ${Sline.checkoutButton.suffix}`;
      }
  
      checkoutButton.removeAttribute("disabled");
    })
  };

  /**
   * Returns a currency symbol based on its ISO name
   * @returns currency symbol
   */
  Sline._GetCurrencySymbol = function () {
    return  "€";
  };

  /**
   * Calculates the price for a product and formats it
   * @param {Number} reference Item
   * @param {Number} qty Quantity
   * @returns
   */
  Sline.GetPriceForProductWithDuration = function (reference, qty) {
    return (
      (Sline.prices[reference]
        ? (Sline.prices[reference][Sline.durationSelector.value].otherInstalmentPrice *
            qty) /
          100
        : 0) + Sline._GetCurrencySymbol()
    );
  };

  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  }
})(this);
