
import numpy as np


def nelder_mead(func, x0, tol=1e-15):
    """Nelder-Mead algorithm
    
    Parameters
    ----------
    func : func
        Cost function.
    x0 : array
        Initial point.
    tol : float, optional
       Absolute tolerance in func(x) that is acceptable for convergence.
       Algorithm terminates when standard deviation of the cost between
       all vertices are small than this value.
       Default 1e-15.
    """
    # 0. Generate initial simplex

    # Extend x0 along the unit vectors to get the vertices.
    n_params = len(x0)
    n_vertices = n_params + 1
    simplex = np.empty(shape=(n_vertices, n_params))  # Empty array

    for i in range(len(simplex)):
        if i == 0:
            simplex[i] = x0
        else:
            j = i-1 # The jth dimension to extend from.
            xj = x0[j]
            # Step size
            if xj == 0:
                hj = 0.00025
            else:
                hj = 0.05

            # Step vector
            xs = np.zeros_like(x0, dtype=float)
            xs[j] = hj  # FIXME add scaling unit vector if convergence is bad.

            simplex[i] = x0 + xs

    return simplex
                
    while 1:  
        # 1. Sort the vertices from best to worst.
        cost_simplex = np.empty(len(simplex))  # contains costs.
        for i in range(len(simplex)):
            cost_simplex[i] = func(*simplex[i])

        # This returns the indices that would sort the simplex
        # from least cost to most cost.  # least cost is best.
        indices = np.argsort(cost_simplex)  

        simplex = simplex[indices]  # Sorted simplex
        cost_simplex = cost_simplex[indices]  # Sorted cost.
        
        # Termination
        std = np.std(cost_simplex)
        if std < tol:
            break
        
        # 2. Calculate centroid of the best vertices.
        x_centroid = np.mean(simplex[:-1], axis=0)

        # 3. Reflection
        alpha = 1
        x_reflect = x_centroid + alpha*(x_centroid-simplex[-1])
        cost_reflect = func(*x_reflect)
        if cost_reflect < cost_simplex[-2] and cost_reflect > cost_simplex[0]:
            # Replace worst simplex
            simplex[-1] = x_reflect
            continue

        # 4. Expansion
        if cost_reflect < cost_simplex[0]:
            gamma = 2
            x_expand = x_centroid + gamma*(x_reflect-x_centroid)
            cost_expand = func(*x_expand)
            if cost_expand < cost_reflect:
                simplex[-1] = x_expand
            else:
                simplex[-1] = x_reflect
            continue
        
        # 5. Contraction
        pho = 0.5
        if cost_reflect < cost_simplex[-1]:
            x_contract = x_centroid + pho*(x_reflect-x_centroid)
            cost_contract = func(*x_contract)
            if cost_contract < cost_reflect:
                simplex[-1] = x_contract
                continue
        elif cost_reflect >= cost_simplex[-1]:
            x_contract = x_centroid + pho*(simplex[-1]-x_centroid)
            cost_contract = func(*x_contract)
            if cost_contract < cost_simplex[-1]:
                simplex[-1] = x_contract
                continue

        # 6. Shrink
        sigma = 0.5
        for i in range(len(simplex)):
            if i != 0:
                simplex[i] = simplex[0] + sigma*(simplex[i]-simplex[0])
    
    return simplex[0]

nelder_mead(lambda: None, [3.6, 64])