import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("bb_cart");
    return saved ? JSON.parse(saved) : [];
  });

  const [appliedOffer, setAppliedOffer] = useState(null);
  const [appliedReward, setAppliedReward] = useState(null);

  useEffect(() => {
    localStorage.setItem("bb_cart", JSON.stringify(cart));
  }, [cart]);

  // Add item to cart
  const addItem = (product, quantity = 1, notes = "") => {
    // 1. Prevent unavailable items
    if (product.isAvailable === false) {
      alert("This item is currently unavailable and cannot be added to the cart.");
      return false;
    }

    // 2. Prevent quantity below 1
    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    // 3. Prevent mixing items from different cafes
    if (cart.length > 0 && product.cafeId && cart[0].product?.cafeId) {
      if (cart[0].product.cafeId.toString() !== product.cafeId.toString()) {
        alert("You cannot add items from a different café to the same cart. Please finish your order or clear the cart first.");
        return false;
      }
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product._id === product._id && item.notes === notes
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex].quantity += qty;
        return updated;
      } else {
        return [
          ...prevCart,
          {
            product,
            name: product.name,
            price: product.price,
            quantity: qty,
            notes,
          },
        ];
      }
    });
    return true;
  };

  // Remove item by index or id
  const removeItem = (index) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  // Update item quantity
  const updateQuantity = (index, delta) => {
    setCart((prevCart) => {
      const updated = [...prevCart];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setAppliedOffer(null);
    setAppliedReward(null);
    localStorage.removeItem("bb_cart");
  };

  // Apply discount offer (coupon)
  const applyOffer = (offerData) => {
    setAppliedOffer(offerData);
    setAppliedReward(null); // one discount type at a time for clean calculations
  };

  // Remove offer
  const removeOffer = () => {
    setAppliedOffer(null);
  };

  // Apply loyalty reward
  const applyReward = (rewardData) => {
    setAppliedReward(rewardData);
    setAppliedOffer(null);
  };

  // Remove reward
  const removeReward = () => {
    setAppliedReward(null);
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  let discountAmount = 0;
  if (appliedOffer) {
    discountAmount = appliedOffer.discountAmount || 0;
  } else if (appliedReward) {
    if (appliedReward.rewardType === "free_item") {
      discountAmount = appliedReward.discountValue || 0;
    } else if (appliedReward.rewardType === "percentage_discount") {
      discountAmount = (subtotal * appliedReward.discountValue) / 100;
    } else {
      discountAmount = appliedReward.discountValue || 0;
    }
  }

  discountAmount = Math.min(discountAmount, subtotal);
  const taxRate = 5; // 5%
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
  const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal: Number(subtotal.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        taxAmount,
        totalAmount,
        totalItemsCount,
        appliedOffer,
        applyOffer,
        removeOffer,
        appliedReward,
        applyReward,
        removeReward,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
