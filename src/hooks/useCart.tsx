import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const havingStock = async (productId: number) => {
    const stockResponse = await api.get(`/stock/${productId}`);
    const stockAmount = stockResponse.data?.ammount;

    return stockAmount && stockAmount >= 1
  }

  const existsProductInCart = (productId: number): boolean => {
    const productIndex = cart.findIndex((product) => {
      return product.id === productId;
    });

    return productIndex !== undefined;
  }

  const addProduct = async (productId: number) => {
    try {
      if (!existsProductInCart(productId)) {
        const productResponse = await api.get(`/product/${productId}`);
        const newProduct = {
          ...productResponse.data,
          ammount: 1,
        };
        setCart([...cart, newProduct])
      } else {
        updateProductAmount({ productId, amount: 1 });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      setCart(oldCart => {
        return oldCart.filter(product => product.id !== productId);
      })
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount === 0) return;

      if (!await havingStock(productId)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const productIndex = cart.findIndex((product) => {
        return product.id === productId;
      });

      const currentProduct = cart[productIndex];
      currentProduct.amount = currentProduct.amount + amount;
      setCart(oldCart => {
        oldCart[productIndex] = currentProduct;
        return oldCart;
      })
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
