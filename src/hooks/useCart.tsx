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

  const addProduct = async (productId: number) => {
    try {
      const copyCart = [...cart];
      const currentStock = await getStock(productId);
      const product = copyCart.find((product) => product.id === productId);
      const currentAmount = product?.amount || 0;
      const newAmount = currentAmount + 1;

      if (newAmount > currentStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (product) {
        debugger
        product.amount = newAmount;
      } else {
        const productResponse = await api.get(`/products/${productId}`);
        copyCart.push({
          ...productResponse.data,
          amount: 1,
        });
      }

      setCart([...copyCart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(copyCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productIndexInCart = cart.findIndex((product) => product.id === productId)

      if (productIndexInCart < 0) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const copyCart = [...cart];
      copyCart.splice(productIndexInCart, 1)

      setCart(copyCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(copyCart));
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

      const copyCart = [...cart];
      const currentProduct = copyCart.find((product) => product.id === productId);

      if (currentProduct) {
        currentProduct.amount = amount;
        setCart(copyCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(copyCart))
      }
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
