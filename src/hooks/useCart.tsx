import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

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

  const getStock = async (productId: number) => {
    const stockResponse = await api.get(`/stock/${productId}`);
    return stockResponse.data?.amount;
  }

  const exitsProductInCart = (productId: number): boolean => {
    return cart.findIndex((product) => product.id === productId) !== -1;
  }

  const findProductInCart = (productId: number): Product => {
    const productIndex = cart.findIndex((product) => product.id === productId);
    return cart[productIndex];
  }

  const addProduct = async (productId: number) => {
    try {
      const product = findProductInCart(productId);

      if (product) {
        updateProductAmount({ productId, amount: product.amount + 1 });
      } else {
        const productResponse = await api.get(`/products/${productId}`);
        const newProduct = {
          ...productResponse.data,
          amount: 1,
        };
        setCart(oldCart => {
          const newCart = [...oldCart, newProduct];
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
          return newCart;
        });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!exitsProductInCart(productId)) {
        toast.error('Erro na remoção do produto');
        return;
      }
      setCart(oldCart => {
        const newCart = oldCart.filter(product => product.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        return newCart;
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

      const currentStock = await getStock(productId);
      
      if (amount > currentStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      setCart(oldCart => {
        const newCart = oldCart.map(product => {
          if(product.id === productId){
            product.amount = amount;
          }
          return product;
        });
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        return newCart;
      })
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
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
